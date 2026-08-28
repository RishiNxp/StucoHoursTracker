import { getChatGPTUser } from "../../../../chatgpt-auth";
import { acceptOfficerInvitation } from "../../../../../src/server/officers-repository";
import { getStorageEnvironment } from "../../../../../src/server/repository";
import type { Actor, StorageEnvironment } from "../../../../../src/server/types";
import { AuthorizationError, OfficerConflictError } from "../../../../../src/server/types";

const MAX_ORGANIZATION_ID_LENGTH = 128;
const MIN_TOKEN_LENGTH = 16;
const MAX_TOKEN_LENGTH = 512;
const ORGANIZATION_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;
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
const isObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

async function requirePlatformIdentity(env: StorageEnvironment): Promise<Omit<Actor, "organizationId">> {
  const dev = env.STUCO_DEV_AUTH === "true" && env.NODE_ENV !== "production";
  const user = dev
    ? { userId: "local-demo", email: "demo@stuco.local", displayName: "Local Demo Officer" }
    : await getChatGPTUser();
  if (!user) throw new AuthorizationError(401, "Sign in with ChatGPT to continue.");
  return { userId: user.userId, email: user.email, displayName: user.displayName };
}

export async function POST(request: Request): Promise<Response> {
  if (!isJson(request)) {
    return failure(400, "INVALID_CONTENT_TYPE", "Send this request as application/json.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure(400, "INVALID_JSON", "Send a valid JSON request body.");
  }

  const organizationId = isObject(body) && typeof body.organizationId === "string"
    ? body.organizationId.trim()
    : "";
  const token = isObject(body) && typeof body.token === "string" ? body.token : "";
  if (
    !organizationId
    || organizationId.length > MAX_ORGANIZATION_ID_LENGTH
    || !ORGANIZATION_ID_PATTERN.test(organizationId)
  ) {
    return failure(400, "INVALID_ORGANIZATION", "This invitation does not identify a valid organization.");
  }
  if (
    token.length < MIN_TOKEN_LENGTH
    || token.length > MAX_TOKEN_LENGTH
    || !TOKEN_PATTERN.test(token)
  ) {
    return failure(400, "INVALID_TOKEN", "This invitation token is malformed.");
  }

  try {
    const env = await getStorageEnvironment();
    const actorIdentity = await requirePlatformIdentity(env);
    const membership = await acceptOfficerInvitation(env, actorIdentity, organizationId, token);
    return json({ ok: true, membership }, 200);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return failure(
        error.status,
        error.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
        error.message,
      );
    }
    if (error instanceof OfficerConflictError) {
      if (error.code === "INVITATION_EMAIL_MISMATCH") {
        return failure(403, error.code, error.message);
      }
      if (error.code === "INVITATION_INVALID") {
        return failure(409, error.code, error.message);
      }
    }
    return failure(500, "ACCEPTANCE_FAILED", "We could not accept that invitation. Please try again.");
  }
}
