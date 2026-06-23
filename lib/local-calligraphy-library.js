import fs from "node:fs";
import path from "node:path";

const libraries = {
  "楷书|褚遂良": "chusuiliang-kaishu",
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

function buildArtworkSvg({ text, script, master, format, glyphs, libraryId }) {
  const vertical = format === "中堂" || format === "条幅" || format === "对联";
  const embedded = glyphs.map((glyph) => glyphDataUrl(libraryId, glyph));

  if (vertical) {
    const width = 720;
    const height = Math.max(1040, embedded.length * 220 + 300);
    const box = 180;
    const xBase = Math.round((width - box) / 2);
    const top = 100;
    const images = embedded
      .map((glyph, index) => {
        const scale = Math.min(box / glyph.width, box / glyph.height);
        const w = Math.round(glyph.width * scale);
        const h = Math.round(glyph.height * scale);
        const x = xBase + Math.round((box - w) / 2);
        const y = top + index * 220 + Math.round((box - h) / 2);
        return `<image href="${glyph.dataUrl}" x="${x}" y="${y}" width="${w}" height="${h}" />`;
      })
      .join("\n");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f5edda" />
  <rect x="34" y="34" width="${width - 68}" height="${height - 68}" fill="none" stroke="#d6bd89" stroke-width="2" opacity="0.72" />
  ${images}
  <text x="112" y="${height - 260}" font-family="serif" font-size="28" fill="#2a1c12" writing-mode="vertical-rl">${escapeXml(master)}集字</text>
  <text x="78" y="${height - 240}" font-family="serif" font-size="22" fill="#6f2a1e" writing-mode="vertical-rl">${escapeXml(script)} · ${escapeXml(format)}</text>
  <rect x="70" y="${height - 128}" width="52" height="52" fill="#b82222" opacity="0.92" />
  <text x="83" y="${height - 92}" font-family="serif" font-size="22" fill="#f7e8d1">墨</text>
  <title>${escapeXml(text)}</title>
</svg>`;
  }

  const box = 190;
  const width = Math.max(1220, embedded.length * 220 + 280);
  const height = 560;
  const left = Math.round((width - embedded.length * 220) / 2);
  const top = 110;
  const images = embedded
    .map((glyph, index) => {
      const scale = Math.min(box / glyph.width, box / glyph.height);
      const w = Math.round(glyph.width * scale);
      const h = Math.round(glyph.height * scale);
      const x = left + index * 220 + Math.round((box - w) / 2);
      const y = top + Math.round((box - h) / 2);
      return `<image href="${glyph.dataUrl}" x="${x}" y="${y}" width="${w}" height="${h}" />`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f5edda" />
  <rect x="34" y="34" width="${width - 68}" height="${height - 68}" fill="none" stroke="#d6bd89" stroke-width="2" opacity="0.72" />
  ${images}
  <text x="${width - 146}" y="${height - 138}" font-family="serif" font-size="28" fill="#2a1c12" writing-mode="vertical-rl">${escapeXml(master)}集字</text>
  <text x="${width - 110}" y="${height - 142}" font-family="serif" font-size="22" fill="#6f2a1e" writing-mode="vertical-rl">${escapeXml(script)} · ${escapeXml(format)}</text>
  <rect x="${width - 112}" y="${height - 102}" width="52" height="52" fill="#b82222" opacity="0.92" />
  <text x="${width - 99}" y="${height - 66}" font-family="serif" font-size="22" fill="#f7e8d1">墨</text>
  <title>${escapeXml(text)}</title>
</svg>`;
}

export function tryGenerateLocalCalligraphy({ text, script, master, format, prompt }) {
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
      continue;
    }
    glyphs.push(glyph);
  }

  if (missingChars.length > 0) {
    return {
      ok: false,
      reason: "missing_chars",
      missingChars,
    };
  }

  const svg = buildArtworkSvg({ text, script, master, format, glyphs, libraryId });
  return {
    ok: true,
    provider: `local-${libraryId}`,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`,
    prompt,
  };
}
