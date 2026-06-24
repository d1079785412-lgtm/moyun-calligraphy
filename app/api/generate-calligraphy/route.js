import {
  buildImagePrompt,
  createMockArtworkSvg,
  formats,
  getFormatMaxChars,
  normalizeCalligraphyText,
  normalizeCharsPerLine,
  normalizeScriptAndMaster,
  scripts,
} from "@/lib/calligraphy";
import { saveWork } from "@/lib/db";
import { tryGenerateLocalCalligraphy } from "@/lib/local-calligraphy-library";
import { generateCalligraphyImage } from "@/lib/model-providers";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json();
  const rawText = String(body.text || "").trim();
  const text = normalizeCalligraphyText(rawText);
  const requestedScript = String(body.script || "楷书").trim();
  const { script, master } = normalizeScriptAndMaster({
    script: requestedScript,
    master: String(body.master || "").trim(),
  });
  const format = String(body.format || "中堂").trim();

  if (!rawText) {
    return Response.json({ error: "请输入想生成的书法内容。" }, { status: 400 });
  }

  if (!scripts.includes(script) || !formats.includes(format)) {
    return Response.json({ error: "书体或作品形式不在支持范围内。" }, { status: 400 });
  }

  const charsPerLine = normalizeCharsPerLine(body.charsPerLine, format);
  const maxChars = getFormatMaxChars(format);
  const charCount = Array.from(rawText).filter((char) => char !== "\n").length;
  if (charCount > maxChars) {
    return Response.json({ error: `${format}最多支持 ${maxChars} 个字。` }, { status: 400 });
  }

  const prompt = buildImagePrompt({ text, script, master, format, charsPerLine });
  const local = tryGenerateLocalCalligraphy({ text, script, master, format, charsPerLine, prompt });

  if (local.ok) {
    const work = saveWork({ text, script, master, format, prompt, imageUrl: local.imageUrl });

    return Response.json({
      provider: local.provider,
      text,
      script,
      master,
      format,
      charsPerLine,
      prompt,
      imageUrl: local.imageUrl,
      work,
      localMissingChars: local.missingChars || [],
    });
  }

  let provider = process.env.IMAGE_MODEL_PROVIDER || "mock";
  let imageUrl;

  try {
    const generated = await generateCalligraphyImage({ prompt, format, script });
    provider = generated.provider;
    imageUrl = generated.imageUrl;
  } catch (error) {
    return Response.json({ error: error.message, prompt }, { status: 500 });
  }

  if (!imageUrl) {
    const svg = createMockArtworkSvg({ text, script, master, format, charsPerLine });
    imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  }

  const work = saveWork({ text, script, master, format, prompt, imageUrl });

  return Response.json({
    provider,
    text,
    script,
    master,
    format,
    charsPerLine,
    prompt,
    imageUrl,
    work,
    localMissingChars: local.missingChars || [],
  });
}
