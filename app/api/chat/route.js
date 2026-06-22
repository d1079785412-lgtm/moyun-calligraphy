import { answerCalligraphyQuestion } from "@/lib/model-providers";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json();
  const question = String(body.question || "").trim();

  if (!question) {
    return Response.json({ error: "请输入书法相关问题。" }, { status: 400 });
  }

  try {
    return Response.json(await answerCalligraphyQuestion(question));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
