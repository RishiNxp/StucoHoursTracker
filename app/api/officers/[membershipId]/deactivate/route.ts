import { deactivateOfficer } from "../../../../../src/server/officers-repository";
import { getStorageEnvironment, requireActiveMember } from "../../../../../src/server/repository";
import { AuthorizationError, OfficerConflictError } from "../../../../../src/server/types";

const MAX_MEMBERSHIP_ID_LENGTH = 128;
const MEMBERSHIP_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const json = (body: unknown, status: number) => Response.json(body, { status });
const issue = (code: string, message: string) => ({ code, message });
const failure = (status: number, code: string, message: string) => json({
  ok: false,
  issues: [issue(code, message)],
}, status);
const isJson = (request: Request) => request.headers.get("content-type")
  ?.split(";", 1)[0]
  .trim()
  .toLowerCase() === "application/json";

export async function POST(
  request: Request,
  context: { params: Promise<{ membershipId: string }> },
): Promise<Response> {
  if (!isJson(request)) {
    return failure(400, "INVALID_CONTENT_TYPE", "Send this request as application/json.");
  }

  const { membershipId: rawMembershipId } = await context.params;
  const membershipId = typeof rawMembershipId === "string" ? rawMembershipId.trim() : "";
  if (
    !membershipId
    || membershipId.length > MAX_MEMBERSHIP_ID_LENGTH
    || !MEMBERSHIP_ID_PATTERN.test(membershipId)
  ) {
    return failure(400, "INVALID_MEMBERSHIP", "Choose a valid officer membership.");
  }

  try {
    const env = await getStorageEnvironment();
    const actor = await requireActiveMember(env, request);
    await deactivateOfficer(env, actor, membershipId);
    return json({ ok: true }, 200);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return failure(
        error.status,
        error.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
        error.message,
      );
    }
    if (error instanceof OfficerConflictError) {
      if (error.code === "LAST_ACTIVE_OFFICER") {
        return failure(409, error.code, error.message);
      }
      if (error.code === "OFFICER_NOT_FOUND") {
        return failure(404, "NOT_FOUND", "Officer membership was not found.");
      }
    }
    return failure(500, "DEACTIVATION_FAILED", "We could not deactivate that officer. Please try again.");
  }
}
