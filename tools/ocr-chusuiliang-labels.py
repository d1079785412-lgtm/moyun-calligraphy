# -*- coding: utf-8 -*-

import csv
import json
import os
import re
import sys
from pathlib import Path

import cv2
import numpy as np
from rapidocr_onnxruntime import RapidOCR


ROOT = Path(r"C:\Users\HUAWEI\Documents\astrbot 2\output\chusuiliang_kaishu_library")
SOURCE_INDEX = ROOT / "chusuiliang_kaishu_candidates_index.json"
PROJECT = Path(os.environ.get("CALLIGRAPHY_PROJECT_DIR", r"C:\Users\HUAWEI\Documents\moyun-calligraphy-deploy"))
TEMPLATE = PROJECT / "public/calligraphy-libraries/chusuiliang-kaishu/char-index-template.csv"
OUTPUT_REPORT = PROJECT / "public/calligraphy-libraries/chusuiliang-kaishu/ocr-label-report.json"

CELL_W = 180
CELL_H = 70
LABEL_X_OFFSET = 30
LABEL_Y_OFFSET = 45
LABEL_W = 170
LABEL_H = 140


def cjk_chars(text):
    return re.findall(r"[\u3400-\u9fff]", text or "")


def page_key(record):
    return record["source"], int(record["page"])


def make_label_page(records, output_path):
    rows = max(int(item["row"]) for item in records)
    cols = max(int(item["column_ltr"]) for item in records)
    canvas = np.full((rows * CELL_H, cols * CELL_W, 3), 255, dtype=np.uint8)
    page = cv2.imread(records[0]["page_image"])
    if page is None:
        raise RuntimeError(f"Could not read page image: {records[0]['page_image']}")

    for record in records:
        x1, _y1, _x2, y2 = [int(value) for value in record["cell_bbox_xyxy"]]
        crop = page[y2 + LABEL_Y_OFFSET : y2 + LABEL_Y_OFFSET + LABEL_H, x1 + LABEL_X_OFFSET : x1 + LABEL_X_OFFSET + LABEL_W]
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
            points = [((min_x + max_x) / 2, min_y + step * (idx + 0.5)) for idx in range(len(chars))]
        else:
            step = width / len(chars)
            points = [(min_x + step * (idx + 0.5), (min_y + max_y) / 2) for idx in range(len(chars))]

        for char, (x, y) in zip(chars, points):
            col = int(x // CELL_W) + 1
            row = int(y // CELL_H) + 1
            if 1 <= row <= rows and 1 <= col <= cols:
                key = (row, col)
                existing = grid.get(key)
                if not existing or score > existing["score"]:
                    grid[key] = {"char": char, "score": float(score), "text": text}

    return grid


def read_template_rows():
    with TEMPLATE.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_template_rows(rows):
    fieldnames = ["char", "simplified", "aliases", "glyph_id", "note"]
    with TEMPLATE.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    limit_pages = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    records = json.loads(SOURCE_INDEX.read_text(encoding="utf-8"))
    by_page = {}
    for record in records:
        by_page.setdefault(page_key(record), []).append(record)

    page_items = sorted(by_page.items(), key=lambda item: (item[0][0], item[0][1]))
    if limit_pages:
        page_items = page_items[:limit_pages]

    ocr = RapidOCR()
    glyph_to_char = {}
    report = []
    label_dir = Path(r"C:\Users\HUAWEI\Documents\ocr-label-pages")

    for (source, page), page_records in page_items:
        page_records = sorted(page_records, key=lambda item: (int(item["row"]), int(item["column_ltr"])))
        image_path = label_dir / f"{source}_p{page:02d}.png"
        rows, cols = make_label_page(page_records, image_path)
        ocr_result, _elapsed = ocr(str(image_path))
        grid = assign_ocr_to_grid(ocr_result, rows, cols)

        assigned = 0
        for record in page_records:
            key = (int(record["row"]), int(record["column_ltr"]))
            item = grid.get(key)
            if item:
                glyph_to_char[record["glyph_id"]] = item["char"]
                assigned += 1

        report.append({
            "page": f"{source}_p{page:02d}",
            "expected": len(page_records),
            "assigned": assigned,
            "missing": len(page_records) - assigned,
        })
        print(f"{source}_p{page:02d}: {assigned}/{len(page_records)}")

    rows = read_template_rows()
    for row in rows:
        char = glyph_to_char.get(row["glyph_id"])
        if char:
            row["char"] = char
            row["aliases"] = char

    write_template_rows(rows)
    OUTPUT_REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(glyph_to_char)} OCR mappings")


if __name__ == "__main__":
    main()
