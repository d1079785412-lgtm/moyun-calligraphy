import fs from "node:fs";
import path from "node:path";

const libraries = {
  "楷书|褚遂良": "chusuiliang-kaishu",
  "隶书|曹全碑": "caoquan-lishu",
  "篆书|铁线篆": "tiexianzhuan",
};

const indexCache = new Map();
const charIndexCache = new Map();

function libraryDir(libraryId) {
  return path.join(process.cwd(), "public", "calligraphy-libraries", libraryId);
}

function loadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function loadGlyphIndex(libraryId) {
  if (indexCache.has(libraryId)) return indexCache.get(libraryId);

  const records = loadJson(path.join(libraryDir(libraryId), "index.json"), []);
  const index = new Map(records.map((record) => [record.id, record]));
  indexCache.set(libraryId, index);
  return index;
}

function loadCharIndex(libraryId) {
  if (charIndexCache.has(libraryId)) return charIndexCache.get(libraryId);

  const index = loadJson(path.join(libraryDir(libraryId), "char-index.json"), {});
  charIndexCache.set(libraryId, index);
  return index;
}

function chooseGlyphId(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] || null;
  return value;
}

function normalizeTextChars(text) {
  return Array.from(String(text || "").replace(/\s+/g, "")).filter(Boolean);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function glyphFilePath(libraryId, glyphUrl) {
  const relative = glyphUrl.replace(`/calligraphy-libraries/${libraryId}/`, "");
  return path.join(libraryDir(libraryId), relative);
}

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function glyphDataUrl(libraryId, glyph) {
  const filePath = glyphFilePath(libraryId, glyph.glyphUrl);
  const buffer = fs.readFileSync(filePath);
  const size = glyph.width && glyph.height ? glyph : readPngSize(filePath);
  return {
    dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    width: size.width,
    height: size.height,
  };
}

function textGlyph(char) {
  return {
    char,
    missing: true,
    width: 180,
    height: 220,
  };
}

function chunkItems(items, size) {
  const chunkSize = Math.max(1, size || items.length || 1);
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function splitCoupletItems(items) {
  if (items.length <= 1) return [items];
  const firstLineLength = Math.max(1, Math.floor(items.length / 2));
  return [items.slice(0, firstLineLength), items.slice(firstLineLength)];
}

function renderGlyphItem(glyph, x, y, width, height) {
  if (!glyph.missing) {
    return `<image href="${glyph.dataUrl}" x="${x}" y="${y}" width="${width}" height="${height}" />`;
  }

  return `<text x="${x + Math.round(width / 2)}" y="${y + Math.round(height * 0.56)}" font-family="KaiTi, STKaiti, SimSun, serif" font-size="${Math.round(height * 0.58)}" fill="#17120f" text-anchor="middle" dominant-baseline="middle">${escapeXml(glyph.char)}</text>`;
}

function buildArtworkSvg({ text, script, master, format, glyphs, libraryId, charsPerLine }) {
  const vertical = format === "中堂" || format === "条幅" || format === "对联";
  const embedded = glyphs.map((glyph) => (glyph.missing ? glyph : glyphDataUrl(libraryId, glyph)));
  const lines = format === "对联" ? splitCoupletItems(embedded) : chunkItems(embedded, charsPerLine);
  const maxLineLength = Math.max(...lines.map((line) => line.length), 1);

  if (vertical) {
    const sideMargin = 120;
    const signatureSpace = 170;
    const width = Math.max(720, signatureSpace + sideMargin + lines.length * 220);
    const height = Math.max(1040, maxLineLength * 220 + 300);
    const box = 180;
    const right = width - sideMargin - box;
    const top = 100;
    const images = lines
      .map((line, column) => {
        return line
          .map((glyph, row) => {
            const scale = Math.min(box / glyph.width, box / glyph.height);
            const w = Math.round(glyph.width * scale);
            const h = Math.round(glyph.height * scale);
            const xBase = right - column * 220;
            const x = xBase + Math.round((box - w) / 2);
            const y = top + row * 220 + Math.round((box - h) / 2);
            return renderGlyphItem(glyph, x, y, w, h);
          })
          .join("\n");
      })
      .join("\n");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f5edda" />
  ${images}
  <text x="112" y="${height - 260}" font-family="serif" font-size="28" fill="#2a1c12" writing-mode="vertical-rl">${escapeXml(master)}集字</text>
  <text x="78" y="${height - 240}" font-family="serif" font-size="22" fill="#6f2a1e" writing-mode="vertical-rl">${escapeXml(script)} · ${escapeXml(format)}</text>
  <rect x="70" y="${height - 128}" width="52" height="52" fill="#b82222" opacity="0.92" />
  <text x="83" y="${height - 92}" font-family="serif" font-size="22" fill="#f7e8d1">墨</text>
  <title>${escapeXml(text)}</title>
</svg>`;
  }

  const box = 190;
  const width = Math.max(1220, maxLineLength * 220 + 280);
  const height = Math.max(560, lines.length * 220 + 340);
  const left = Math.round((width - maxLineLength * 220) / 2);
  const top = 110;
  const images = lines
    .map((line, lineIndex) => {
      return line
        .map((glyph, index) => {
          const scale = Math.min(box / glyph.width, box / glyph.height);
          const w = Math.round(glyph.width * scale);
          const h = Math.round(glyph.height * scale);
          const x = left + index * 220 + Math.round((box - w) / 2);
          const y = top + lineIndex * 220 + Math.round((box - h) / 2);
          return renderGlyphItem(glyph, x, y, w, h);
        })
        .join("\n");
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f5edda" />
  ${images}
  <text x="${width - 146}" y="${height - 138}" font-family="serif" font-size="28" fill="#2a1c12" writing-mode="vertical-rl">${escapeXml(master)}集字</text>
  <text x="${width - 110}" y="${height - 142}" font-family="serif" font-size="22" fill="#6f2a1e" writing-mode="vertical-rl">${escapeXml(script)} · ${escapeXml(format)}</text>
  <rect x="${width - 112}" y="${height - 102}" width="52" height="52" fill="#b82222" opacity="0.92" />
  <text x="${width - 99}" y="${height - 66}" font-family="serif" font-size="22" fill="#f7e8d1">墨</text>
  <title>${escapeXml(text)}</title>
</svg>`;
}

export function tryGenerateLocalCalligraphy({ text, script, master, format, charsPerLine, prompt }) {
  const libraryId = libraries[`${script}|${master}`];
  if (!libraryId) {
    return { ok: false, reason: "no_local_library", missingChars: [] };
  }

  const chars = normalizeTextChars(text);
  const charIndex = loadCharIndex(libraryId);
  const glyphIndex = loadGlyphIndex(libraryId);
  const missingChars = [];
  const glyphs = [];

  for (const char of chars) {
    const glyphId = chooseGlyphId(charIndex[char]);
    const glyph = glyphId ? glyphIndex.get(glyphId) : null;
    if (!glyph) {
      if (!missingChars.includes(char)) missingChars.push(char);
      if (libraryId === "caoquan-lishu") glyphs.push(textGlyph(char));
      continue;
    }
    glyphs.push(glyph);
  }

  if (missingChars.length > 0 && libraryId !== "caoquan-lishu") {
    return {
      ok: false,
      reason: "missing_chars",
      missingChars,
    };
  }

  const svg = buildArtworkSvg({ text, script, master, format, glyphs, libraryId, charsPerLine });
  return {
    ok: true,
    provider: `local-${libraryId}`,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`,
    prompt,
    missingChars,
  };
}
