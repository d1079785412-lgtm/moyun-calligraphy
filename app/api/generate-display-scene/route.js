import {
  buildDisplayScenePrompt,
  createMockArtworkSvg,
  displaySceneModes,
  formats,
  normalizeCalligraphyText,
  normalizeScriptAndMaster,
  scripts,
} from "@/lib/calligraphy";
import { generateSceneImage } from "@/lib/model-providers";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json();
  const rawText = String(body.text || "").trim();
  const text = normalizeCalligraphyText(rawText);
  const { script, master } = normalizeScriptAndMaster({
    script: String(body.script || "楷书").trim(),
    master: String(body.master || "").trim(),
  });
  const format = String(body.format || "中堂").trim();
  const sceneMode = String(body.sceneMode || "framed").trim();
  const referenceImageUrl = String(body.imageUrl || "").trim();

  if (!rawText) {
    return Response.json({ error: "请先生成书法作品，再生成装框效果图。" }, { status: 400 });
  }

  if (!scripts.includes(script) || !formats.includes(format) || !displaySceneModes[sceneMode]) {
    return Response.json({ error: "装框效果参数不在支持范围内。" }, { status: 400 });
  }

  const prompt = buildDisplayScenePrompt({ text, script, master, format, sceneMode });
  const usableReference = /^https?:\/\//i.test(referenceImageUrl) || /^data:image\/(png|jpe?g|webp|svg\+xml);base64,/i.test(referenceImageUrl)
    ? referenceImageUrl
    : "";

  let provider = process.env.IMAGE_MODEL_PROVIDER || "mock";
  let imageUrl;

  try {
    const generated = await generateSceneImage({
      prompt,
      format,
      script,
      referenceImageUrl: usableReference,
    });
    provider = generated.provider;
    imageUrl = generated.imageUrl;
  } catch (error) {
    return Response.json({ error: error.message, prompt }, { status: 500 });
  }

  if (!imageUrl) {
    const svg = createMockArtworkSvg({ text, script, master, format });
    imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  }

  return Response.json({
    provider,
    sceneMode,
    sceneName: displaySceneModes[sceneMode],
    prompt,
    imageUrl,
  });
}
