import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const libraryDir = path.join(root, "public", "calligraphy-libraries", "chusuiliang-kaishu");
const report = JSON.parse(fs.readFileSync(path.join(libraryDir, "grid-label-ocr-report.json"), "utf8"));
const index = JSON.parse(fs.readFileSync(path.join(libraryDir, "index.json"), "utf8"));
const byId = new Map(index.map((record) => [record.id, record]));
const templateRows = parseCsv(fs.readFileSync(path.join(libraryDir, "char-index-template.csv"), "utf8"));
const templateHeader = templateRows[0];
const templateColumns = Object.fromEntries(templateHeader.map((name, index) => [name, index]));
const templateByGlyphId = new Map(
  templateRows.slice(1).map((row) => [row[templateColumns.glyph_id], row]),
);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === "\"" && next === "\"") {
        field += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((item) => item.some((value) => value !== ""));
}

const rows = report.map((item) => {
  const glyph = byId.get(item.glyphId) || {};
  const templateRow = templateByGlyphId.get(item.glyphId);
  const reviewedChar = templateRow?.[templateColumns.char] || "";
  return {
    id: item.glyphId,
    char: reviewedChar,
    text: item.ocr?.text || "",
    score: item.ocr?.score == null ? null : Number(item.ocr.score.toFixed(4)),
    source: item.source,
    page: item.page,
    col: item.columnLtr,
    row: item.row,
    glyphUrl: glyph.glyphUrl ? glyph.glyphUrl.replace("/calligraphy-libraries/chusuiliang-kaishu/", "") : `glyphs/${item.glyphId}.png`,
  };
});

const documentRows = rows.map((row) => ({
  ...row,
  glyphUrl: `file:///C:/Users/HUAWEI/Documents/moyun-calligraphy-deploy/public/calligraphy-libraries/chusuiliang-kaishu/${row.glyphUrl}`,
}));

function buildHtml(dataRows) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>褚遂良楷书字库人工校对</title>
  <style>
    :root { color-scheme: light; font-family: "Microsoft YaHei", system-ui, sans-serif; }
    body { margin: 0; background: #f6f3ec; color: #241b13; }
    header { position: sticky; top: 0; z-index: 10; background: rgba(246, 243, 236, .96); border-bottom: 1px solid #ddd0bb; padding: 12px 16px; display: grid; gap: 10px; }
    h1 { margin: 0; font-size: 18px; font-weight: 700; }
    .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    input, select, button { height: 34px; border: 1px solid #cdbfaa; background: #fffdf8; color: #241b13; border-radius: 6px; padding: 0 10px; font-size: 14px; }
    button { cursor: pointer; background: #2f5d50; color: #fff; border-color: #2f5d50; }
    button.secondary { background: #fffdf8; color: #241b13; }
    main { padding: 16px; }
    .stats { font-size: 13px; color: #6b5c4a; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .card { background: #fffdf8; border: 1px solid #ddd0bb; border-radius: 8px; padding: 8px; display: grid; gap: 6px; }
    .glyph { height: 112px; display: grid; place-items: center; background: #fff; border-radius: 6px; border: 1px solid #eee4d5; }
    .glyph img { max-width: 104px; max-height: 104px; object-fit: contain; }
    .meta { font-size: 12px; color: #6b5c4a; line-height: 1.35; overflow-wrap: anywhere; }
    .ocr { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .ocr strong { font-size: 24px; line-height: 1; }
    .score { font-size: 12px; color: #8b6d42; }
    .fix { display: grid; grid-template-columns: 1fr auto; gap: 6px; }
    .fix input { width: 100%; box-sizing: border-box; text-align: center; font-size: 18px; }
    .mark { width: 100%; }
    .bad { outline: 2px solid #c74b3a; }
    .changed { outline: 2px solid #2f7d55; }
    textarea { width: 100%; min-height: 140px; box-sizing: border-box; margin-top: 12px; font-family: ui-monospace, Consolas, monospace; }
  </style>
</head>
<body>
  <header>
    <h1>褚遂良楷书字库人工校对</h1>
    <div class="bar">
      <input id="q" placeholder="搜字 / glyph_id / 页码，如 輔 或 cs1_p19" />
      <select id="mode">
        <option value="all">全部</option>
        <option value="changed">只看已修改</option>
        <option value="blank">只看未识别</option>
        <option value="low">只看低置信</option>
      </select>
      <select id="pageSize">
        <option value="120">每页 120</option>
        <option value="240">每页 240</option>
        <option value="480">每页 480</option>
      </select>
      <button id="prev" class="secondary">上一页</button>
      <button id="next" class="secondary">下一页</button>
      <button id="exportCsv">导出修正 CSV</button>
      <button id="clear" class="secondary">清空本地修改</button>
    </div>
    <div class="stats" id="stats"></div>
    <div class="stats">改字方法：在每个卡片的输入框里直接输入正确释文，修改会自动临时保存；点“导出修正 CSV”后把内容发给我即可。</div>
  </header>
  <main>
    <div class="grid" id="grid"></div>
    <textarea id="out" placeholder="导出的修正 CSV 会显示在这里"></textarea>
  </main>
  <script>
    const rows = ${JSON.stringify(dataRows)};
    const storageKey = "chusuiliang-review-corrections-v1";
    let corrections = JSON.parse(localStorage.getItem(storageKey) || "{}");
    let page = 0;

    const $ = (id) => document.getElementById(id);
    const q = $("q");
    const mode = $("mode");
    const pageSize = $("pageSize");
    const grid = $("grid");
    const stats = $("stats");
    const out = $("out");

    function save() {
      localStorage.setItem(storageKey, JSON.stringify(corrections));
    }

    function effectiveChar(row) {
      return corrections[row.id]?.char ?? row.char;
    }

    function filtered() {
      const term = q.value.trim();
      const m = mode.value;
      return rows.filter((row) => {
        const changed = corrections[row.id]?.char !== undefined && corrections[row.id].char !== row.char;
        if (m === "changed" && !changed) return false;
        if (m === "blank" && row.char) return false;
        if (m === "low" && !(row.score == null || row.score < 0.9)) return false;
        if (!term) return true;
        return row.id.includes(term) || row.char.includes(term) || row.text.includes(term) || String(row.page) === term || effectiveChar(row).includes(term);
      });
    }

    function render() {
      const list = filtered();
      const size = Number(pageSize.value);
      const pages = Math.max(1, Math.ceil(list.length / size));
      page = Math.min(page, pages - 1);
      const slice = list.slice(page * size, page * size + size);
      const changedCount = Object.values(corrections).filter((item) => item.char !== undefined).length;
      stats.textContent = \`共 \${rows.length} 格，当前筛选 \${list.length} 格，第 \${page + 1}/\${pages} 页，已修改 \${changedCount} 格\`;
      grid.innerHTML = slice.map((row) => {
        const fixed = effectiveChar(row);
        const changed = corrections[row.id]?.char !== undefined && corrections[row.id].char !== row.char;
        const low = row.score == null || row.score < 0.9;
        return \`
          <article class="card \${changed ? "changed" : low ? "bad" : ""}">
            <div class="glyph"><img src="\${row.glyphUrl}" loading="lazy" alt="\${row.id}" /></div>
            <div class="ocr"><strong>\${row.char || "□"}</strong><span class="score">\${row.score == null ? "无识别" : row.score}</span></div>
            <div class="fix">
              <input data-id="\${row.id}" value="\${fixed}" maxlength="2" />
              <button type="button" class="secondary mark" data-id="\${row.id}" data-clear="1">清</button>
            </div>
            <div class="meta">\${row.id}<br />\${row.source} 第 \${row.page} 页 / 第 \${row.col} 列 / 第 \${row.row} 行<br />OCR: \${row.text || "空"}</div>
          </article>
        \`;
      }).join("");
    }

    grid.addEventListener("input", (event) => {
      if (event.target.matches("input[data-id]")) {
        const id = event.target.dataset.id;
        corrections[id] = { char: event.target.value.trim() };
        save();
        event.target.closest(".card")?.classList.add("changed");
        const changedCount = Object.values(corrections).filter((item) => item.char !== undefined).length;
        stats.textContent = stats.textContent.replace(/已修改 \\d+ 格/, \`已修改 \${changedCount} 格\`);
      }
    });

    grid.addEventListener("change", (event) => {
      if (event.target.matches("input[data-id]")) render();
    });

    grid.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-clear]");
      if (!button) return;
      delete corrections[button.dataset.id];
      save();
      render();
    });

    $("prev").onclick = () => { page = Math.max(0, page - 1); render(); };
    $("next").onclick = () => { page += 1; render(); };
    q.oninput = () => { page = 0; render(); };
    mode.onchange = () => { page = 0; render(); };
    pageSize.onchange = () => { page = 0; render(); };
    $("clear").onclick = () => {
      if (confirm("确定清空本地修改？")) {
        corrections = {};
        save();
        render();
      }
    };
    $("exportCsv").onclick = () => {
      const lines = ["glyph_id,char"];
      for (const row of rows) {
        if (corrections[row.id]?.char !== undefined && corrections[row.id].char !== row.char) {
          lines.push(\`\${row.id},\${corrections[row.id].char}\`);
        }
      }
      out.value = lines.join("\\n");
      const blob = new Blob([out.value + "\\n"], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "chusuiliang-corrections.csv";
      a.click();
      URL.revokeObjectURL(url);
    };

    render();
  </script>
</body>
</html>
`;
}

const outputPath = path.join(libraryDir, "review.html");
fs.writeFileSync(outputPath, buildHtml(rows), "utf8");
fs.writeFileSync("C:/Users/HUAWEI/Documents/褚遂良楷书人工校对.html", buildHtml(documentRows), "utf8");
console.log(outputPath);
console.log("C:/Users/HUAWEI/Documents/褚遂良楷书人工校对.html");
