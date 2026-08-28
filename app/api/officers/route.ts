import { listOfficers } from "../../../src/server/officers-repository";
import { getStorageEnvironment, requireActiveMember } from "../../../src/server/repository";
import { AuthorizationError } from "../../../src/server/types";

const json = (body: unknown, status: number) => Response.json(body, { status });
const issue = (code: string, message: string) => ({ code, message });

export async function GET(request: Request): Promise<Response> {
  try {
    const env = await getStorageEnvironment();
    const actor = await requireActiveMember(env, request);
    const officers = await listOfficers(env, actor);
    return json({ ok: true, officers }, 200);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return json({
        ok: false,
        issues: [issue(error.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN", error.message)],
      }, error.status);
    }
    return json({
      ok: false,
      issues: [issue("OFFICERS_FAILED", "Officer access is temporarily unavailable.")],
    }, 500);
  }
}
