import { getAnalysis, getStorageEnvironment, requireActiveMember } from "../../../../src/server/repository";
import { AuthorizationError } from "../../../../src/server/types";
const json = (body: unknown, status: number) => Response.json(body, { status });
export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try { const env = await getStorageEnvironment(); const actor = await requireActiveMember(env, request); const { id } = await context.params; const analysis = await getAnalysis(env, actor, id); return analysis ? json({ ok: true, analysis }, 200) : json({ ok: false, issues: [{ code: "NOT_FOUND", message: "Analysis not found." }] }, 404); }
  catch (error) { if (error instanceof AuthorizationError) return json({ ok: false, issues: [{ code: error.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN", message: error.message }] }, error.status); return json({ ok: false, issues: [{ code: "DETAIL_FAILED", message: "This analysis is temporarily unavailable." }] }, 500); }
}
