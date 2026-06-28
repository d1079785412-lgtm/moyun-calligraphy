import { generatePoemText } from "@/lib/model-providers";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json();
  const keywords = String(body.keywords || "").trim();
  const genre = String(body.genre || "四字雅句").trim();

  try {
    return Response.json(await generatePoemText({ keywords, genre }));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
