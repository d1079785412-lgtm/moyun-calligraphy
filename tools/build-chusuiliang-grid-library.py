# -*- coding: utf-8 -*-

import csv
import json
import os
import re
from pathlib import Path

import cv2
import numpy as np
from rapidocr_onnxruntime import RapidOCR


SOURCE_ROOT = Path(
    os.environ.get(
        "CHUSUILIANG_GRID_SOURCE_DIR",
        r"C:\Users\HUAWEI\Documents\astrbot 2\output\chusuiliang_kaishu_library",
    )
)
PROJECT = Path(os.environ.get("CALLIGRAPHY_PROJECT_DIR", r"C:\Users\HUAWEI\Documents\moyun-calligraphy-deploy"))
LIBRARY_DIR = PROJECT / "public/calligraphy-libraries/chusuiliang-kaishu"
SOURCE_INDEX = SOURCE_ROOT / "chusuiliang_kaishu_candidates_index.json"
TEMPLATE_CSV = LIBRARY_DIR / "char-index-template.csv"
CHAR_INDEX_JSON = LIBRARY_DIR / "char-index.json"
REPORT_JSON = LIBRARY_DIR / "grid-label-ocr-report.json"
LABEL_SHEET_DIR = Path(os.environ.get("CHUSUILIANG_LABEL_SHEET_DIR", r"C:\Users\HUAWEI\Documents\chusuiliang-label-sheets"))

CELL_W = 180
CELL_H = 76
LABEL_X_OFFSET = 20
LABEL_Y_OFFSET = 30
LABEL_W = 220
LABEL_H = 170


def cjk_chars(text):
    return re.findall(r"[\u3400-\u9fff]", text or "")


def page_key(record):
    return record["source"], int(record["page"])


def load_simplified_aliases():
    aliases = {}
    source = PROJECT / "lib/calligraphy.js"
    for line in source.read_text(encoding="utf-8").splitlines():
        match = re.match(r'\s*([\u3400-\u9fff]):\s*"([\u3400-\u9fff])",', line)
        if match:
            simplified, traditional = match.groups()
            aliases[simplified] = traditional
    return aliases


def make_label_sheet(records, output_path):
    rows = max(int(item["row"]) for item in records)
    cols = max(int(item["column_ltr"]) for item in records)
    canvas = np.full((rows * CELL_H, cols * CELL_W, 3), 255, dtype=np.uint8)
    page = cv2.imread(records[0]["page_image"])
    if page is None:
        raise RuntimeError(f"Could not read page image: {records[0]['page_image']}")

    for record in records:
        x1, _y1, _x2, y2 = [int(value) for value in record["cell_bbox_xyxy"]]
        crop = page[
            y2 + LABEL_Y_OFFSET : y2 + LABEL_Y_OFFSET + LABEL_H,
            x1 + LABEL_X_OFFSET : x1 + LABEL_X_OFFSET + LABEL_W,
        ]
        if crop.size == 0:
            continue
        resized = cv2.resize(crop, (CELL_W, CELL_H), interpolation=cv2.INTER_CUBIC)
        row = int(record["row"]) - 1
        col = int(record["column_ltr"]) - 1
        canvas[row * CELL_H : (row + 1) * CELL_H, col * CELL_W : (col + 1) * CELL_W] = resized

    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), canvas)
    return rows, cols


def assign_ocr_to_grid(ocr_result, rows, cols):
    grid = {}
    for box, text, score in ocr_result or []:
        chars = cjk_chars(text)
        if not chars:
            continue

        xs = [point[0] for point in box]
        ys = [point[1] for point in box]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        width = max_x - min_x
        height = max_y - min_y

        if len(chars) == 1:
            points = [((min_x + max_x) / 2, (min_y + max_y) / 2)]
        elif height > width * 1.25:
            step = height / len(chars)
            points = [((min_x + max_x) / 2, min_y + step * (index + 0.5)) for index in range(len(chars))]
        else:
            step = width / len(chars)
            points = [(min_x + step * (index + 0.5), (min_y + max_y) / 2) for index in range(len(chars))]

        for char, (x, y) in zip(chars, points):
            col = int(x // CELL_W) + 1
            row = int(y // CELL_H) + 1
            if 1 <= row <= rows and 1 <= col <= cols:
                key = (row, col)
                existing = grid.get(key)
                item = {"char": char, "text": text, "score": float(score)}
                if not existing or item["score"] > existing["score"]:
                    grid[key] = item
    return grid


def write_template_rows(rows):
    with TEMPLATE_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["char", "simplified", "aliases", "glyph_id", "note"])
        writer.writeheader()
        writer.writerows(rows)


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    records = json.loads(SOURCE_INDEX.read_text(encoding="utf-8"))
    by_page = {}
    for record in records:
        by_page.setdefault(page_key(record), []).append(record)

    ocr = RapidOCR()
    simplified_aliases = load_simplified_aliases()
    rows = []
    char_index = {}
    report = []

    for (source, page), page_records in sorted(by_page.items(), key=lambda item: (item[0][0], item[0][1])):
        page_records = sorted(page_records, key=lambda item: (int(item["row"]), int(item["column_ltr"])))
        sheet_path = LABEL_SHEET_DIR / f"{source}_p{page:02d}.png"
        sheet_rows, sheet_cols = make_label_sheet(page_records, sheet_path)
        ocr_result, _elapsed = ocr(str(sheet_path))
        grid = assign_ocr_to_grid(ocr_result, sheet_rows, sheet_cols)

        assigned = 0
        for record in page_records:
            item = grid.get((int(record["row"]), int(record["column_ltr"])))
            char = item["char"] if item else ""
            aliases = char
            simplified = ""

            if char:
                assigned += 1
                if char not in char_index:
                    char_index[char] = record["glyph_id"]
                normalized = simplified_aliases.get(char)
                if normalized:
                    simplified = char
                    aliases = f"{char}|{normalized}"
                    if normalized not in char_index:
                        char_index[normalized] = record["glyph_id"]

            rows.append(
                {
                    "char": char,
                    "simplified": simplified,
                    "aliases": aliases,
                    "glyph_id": record["glyph_id"],
                    "note": "",
                }
            )
            report.append(
                {
                    "glyphId": record["glyph_id"],
                    "char": char,
                    "source": source,
                    "page": page,
                    "columnLtr": int(record["column_ltr"]),
                    "row": int(record["row"]),
                    "ocr": item,
                }
            )

        print(f"{source}_p{page:02d}: {assigned}/{len(page_records)}")

    write_template_rows(rows)
    write_json(CHAR_INDEX_JSON, char_index)
    write_json(REPORT_JSON, report)
    print(f"Wrote {len(rows)} grid labels and {len(char_index)} character mappings")


if __name__ == "__main__":
    main()
