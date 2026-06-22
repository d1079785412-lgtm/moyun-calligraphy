import { formats } from "@/lib/calligraphy";
import { createLayoutAdvice } from "@/lib/model-providers";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json();
  const text = String(body.text || "").trim();
  const format = String(body.format || "中堂").trim();

  if (!text) {
    return Response.json({ error: "请输入需要设计章法的文字。" }, { status: 400 });
  }

  if (!formats.includes(format)) {
    return Response.json({ error: "作品形式不在支持范围内。" }, { status: 400 });
  }

  try {
    return Response.json(await createLayoutAdvice({ text, format }));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
