import { Converter } from "opencc-js";

export const scripts = ["楷书", "行书", "草书", "隶书", "篆书"];

export const masters = [
  "王羲之",
  "颜真卿",
  "柳公权",
  "欧阳询",
  "褚遂良",
  "米芾",
  "赵孟頫",
];

export const formats = ["中堂", "条幅", "横幅", "对联", "扇面"];

const toTraditional = Converter({ from: "cn", to: "tw" });

const calligraphyKeywords = [
  "书法",
  "书体",
  "楷书",
  "行书",
  "草书",
  "隶书",
  "篆书",
  "碑帖",
  "临摹",
  "章法",
  "笔法",
  "墨法",
  "结字",
  "落款",
  "印章",
  "王羲之",
  "颜真卿",
  "柳公权",
  "欧阳询",
  "褚遂良",
  "米芾",
  "赵孟頫",
  "兰亭序",
  "多宝塔",
  "九成宫",
  "曹全碑",
  "石鼓文",
];

export function isCalligraphyQuestion(question = "") {
  return calligraphyKeywords.some((keyword) => question.includes(keyword));
}

export function normalizeCalligraphyText(text = "") {
  return toTraditional(String(text).trim());
}

export function buildImagePrompt({ text, script, master, format }) {
  return `生成一幅中国传统书法作品，内容为“${text}”，必须使用繁体中文/正体中文字形，书体为${script}，风格参考${master}，作品形式为${format}。使用宣纸质感，黑色墨迹，自然飞白，传统落款，朱红印章。整体章法端正，墨色有浓淡变化，画面干净，适合书法艺术展示。注意保持中文字形准确，不要生成乱码，不要改成简体字，不要添加无关文字。`;
}

export function buildLayoutAdvice({ text, format }) {
  const count = Array.from(text || "").length;
  const formatTips = {
    中堂: "采用竖向居中布局，正文宜占画面中轴，四周留白充足，适合庄重题材。",
    条幅: "采用单列或双列竖排，行气要连贯，上紧下松，适合诗句、格言。",
    横幅: "采用横向展开布局，字势保持水平节奏，左右留白要均衡。",
    对联: "上下联字数、重心、行距保持一致，右联在右、左联在左，横批可置于上方。",
    扇面: "顺应扇面弧线安排字势，外缘略疏、内缘略密，避免文字挤压。",
  };

  return {
    charSpacing: count <= 4 ? "字距可略放宽，突出单字姿态。" : "字距宜均匀，长句可按语义小幅分组。",
    lineSpacing: format === "横幅" ? "行距保持紧凑平稳，避免横向画面松散。" : "行距略大于字距，保证竖行之间气息通畅。",
    signature: format === "横幅" ? "落款建议放在左下角或左侧边缘。" : "落款建议置于正文左侧偏下位置，字形略小。",
    seal: "朱文或白文印可放在落款下方；若画面偏空，可在起首处加引首章平衡视觉。",
    overall: formatTips[format] || "保持正文主轴清晰，留白、落款与印章形成稳定呼应。",
  };
}

export function mockChatAnswer(question) {
  if (!isCalligraphyQuestion(question)) {
    return "本平台主要服务书法学习与创作。你可以咨询书法史、书体、碑帖、名家、技法、章法或临摹方法等问题。";
  }

  return `这是一个 mock 大模型回答：针对“${question}”，建议先从“观察、分解、临写、对照、复盘”五步入手。学习书法时可重点关注笔画起收、转折提按、结字重心、行气节奏和章法留白。若涉及碑帖学习，建议先选择一种主帖长期临摹，再以同风格名家作品作横向比较。`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function splitChars(text) {
  return Array.from(text || "墨韵智创").slice(0, 24);
}

export function createMockArtworkSvg({ text, script, master, format }) {
  const chars = splitChars(text);
  const isHorizontal = format === "横幅";
  const width = isHorizontal ? 1200 : 820;
  const height = isHorizontal ? 620 : 1080;
  const fontSize = isHorizontal ? 94 : 86;
  const family = script === "篆书" ? "STKaiti, KaiTi, serif" : "KaiTi, STKaiti, SimSun, serif";
  const columns = format === "对联" ? 2 : isHorizontal ? 1 : Math.max(1, Math.ceil(chars.length / 8));
  const rows = isHorizontal ? 1 : Math.ceil(chars.length / columns);
  const content = [];

  if (isHorizontal) {
    const startX = width / 2 - (chars.length - 1) * fontSize * 0.47;
    chars.forEach((char, index) => {
      content.push(`<text x="${startX + index * fontSize * 0.94}" y="${height / 2 + 28}" class="main">${escapeXml(char)}</text>`);
    });
  } else if (format === "对联") {
    const left = chars.slice(Math.ceil(chars.length / 2));
    const right = chars.slice(0, Math.ceil(chars.length / 2));
    [right, left].forEach((group, column) => {
      const x = column === 0 ? width * 0.68 : width * 0.32;
      group.slice(0, 12).forEach((char, row) => {
        content.push(`<text x="${x}" y="${170 + row * fontSize * 1.06}" class="main">${escapeXml(char)}</text>`);
      });
    });
  } else {
    chars.forEach((char, index) => {
      const column = Math.floor(index / rows);
      const row = index % rows;
      const x = width * 0.68 - column * fontSize * 1.06;
      content.push(`<text x="${x}" y="${180 + row * fontSize * 1.08}" class="main">${escapeXml(char)}</text>`);
    });
  }

  const sealX = isHorizontal ? width - 160 : 130;
  const sealY = isHorizontal ? height - 150 : height - 190;
  const signatureX = isHorizontal ? width - 270 : 112;
  const signatureY = isHorizontal ? height - 118 : height - 365;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="paperNoise">
      <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="12"/>
      <feColorMatrix type="saturate" values="0"/>
      <feBlend mode="multiply" in2="SourceGraphic"/>
    </filter>
    <style>
      .main { font-family: ${family}; font-size: ${fontSize}px; fill: #17120f; text-anchor: middle; dominant-baseline: middle; font-weight: 500; }
      .sub { font-family: KaiTi, STKaiti, serif; font-size: 30px; fill: #2b2520; writing-mode: tb; }
      .small { font-family: KaiTi, STKaiti, serif; font-size: 24px; fill: #7d1f17; writing-mode: tb; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="#f4eedf"/>
  <rect x="34" y="34" width="${width - 68}" height="${height - 68}" fill="none" stroke="#d8c8aa" stroke-width="2"/>
  <path d="M70 ${height - 86} C ${width * 0.38} ${height - 120}, ${width * 0.65} ${height - 40}, ${width - 80} ${height - 96}" fill="none" stroke="#d6cab3" stroke-width="4" opacity="0.38"/>
  <g filter="url(#paperNoise)">
    ${content.join("\n    ")}
  </g>
  <text x="${signatureX}" y="${signatureY}" class="sub">AI摹${escapeXml(master)}意</text>
  <text x="${signatureX + 34}" y="${signatureY + 18}" class="small">${escapeXml(script)} · ${escapeXml(format)}</text>
  <rect x="${sealX}" y="${sealY}" width="78" height="78" fill="#a62319" opacity="0.94"/>
  <text x="${sealX + 39}" y="${sealY + 18}" font-family="KaiTi, STKaiti, serif" font-size="22" fill="#f8ead6" text-anchor="middle">
    <tspan x="${sealX + 39}" dy="22">墨韵</tspan><tspan x="${sealX + 39}" dy="26">智创</tspan>
  </text>
</svg>`;
}
