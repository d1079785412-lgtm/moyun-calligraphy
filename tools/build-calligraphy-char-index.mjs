import fs from "node:fs";
import path from "node:path";

const [, , libraryId = "chusuiliang-kaishu"] = process.argv;
const libraryDir = path.join(process.cwd(), "public", "calligraphy-libraries", libraryId);
const sourcePath = path.join(libraryDir, "char-index-template.csv");
const outputPath = path.join(libraryDir, "char-index.json");

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      fields.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current);
  return fields;
}

function splitAliases(value) {
  return String(value || "")
    .split(/[|/、，,\s]+/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

const csv = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "");
const [headerLine, ...rows] = csv.split(/\r?\n/).filter(Boolean);
const headers = parseCsvLine(headerLine);
const charIndex = headers.indexOf("char");
const glyphIdIndex = headers.indexOf("glyph_id");
const simplifiedIndex = headers.indexOf("simplified");
const aliasesIndex = headers.indexOf("aliases");

if (charIndex === -1 || glyphIdIndex === -1) {
  throw new Error(`${sourcePath} must include char and glyph_id columns.`);
}

const output = {};
const conflicts = [];

for (const row of rows) {
  const fields = parseCsvLine(row);
  const glyphId = fields[glyphIdIndex]?.trim();
  const keys = [
    ...splitAliases(fields[charIndex]),
    ...splitAliases(simplifiedIndex === -1 ? "" : fields[simplifiedIndex]),
    ...splitAliases(aliasesIndex === -1 ? "" : fields[aliasesIndex]),
  ];

  if (!glyphId || keys.length === 0) continue;

  for (const key of new Set(keys)) {
    if (output[key] && output[key] !== glyphId) {
      conflicts.push(`${key}: ${output[key]} -> ${glyphId}`);
      continue;
    }
    output[key] = glyphId;
  }
}

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(`Wrote ${Object.keys(output).length} character mappings to ${outputPath}`);
if (conflicts.length > 0) {
  console.warn(`Skipped ${conflicts.length} conflicting mappings:`);
  for (const conflict of conflicts.slice(0, 20)) console.warn(`- ${conflict}`);
}
