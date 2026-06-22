import { buildImagePrompt, createMockArtworkSvg, formats, masters, normalizeCalligraphyText, scripts } from "@/lib/calligraphy";
import { saveWork } from "@/lib/db";
import { generateCalligraphyImage } from "@/lib/model-providers";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json();
  const rawText = String(body.text || "").trim();
  const text = normalizeCalligraphyText(rawText);
  const script = String(body.script || "楷书").trim();
  const master = String(body.master || "王羲之").trim();
  const format = String(body.format || "中堂").trim();

  if (!rawText) {
    return Response.json({ error: "请输入想生成的书法内容。" }, { status: 400 });
  }

  if (!scripts.includes(script) || !masters.includes(master) || !formats.includes(format)) {
    return Response.json({ error: "书体、风格参考或作品形式不在支持范围内。" }, { status: 400 });
  }

  const prompt = buildImagePrompt({ text, script, master, format });
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
    const svg = createMockArtworkSvg({ text, script, master, format });
    imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  }

  const work = saveWork({ text, script, master, format, prompt, imageUrl });

  return Response.json({
    provider,
    prompt,
    imageUrl,
    work,
  });
}
