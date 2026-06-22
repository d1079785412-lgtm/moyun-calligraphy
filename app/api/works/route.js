import { listWorks } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ works: listWorks() });
}
