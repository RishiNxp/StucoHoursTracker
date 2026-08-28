import { createOfficerInvitation } from "../../../../src/server/officers-repository";
import { getStorageEnvironment, requireActiveMember } from "../../../../src/server/repository";
import type { StorageEnvironment } from "../../../../src/server/types";
import { AuthorizationError, OfficerConflictError } from "../../../../src/server/types";

const MAX_EMAIL_LENGTH = 254;
const MAX_ORGANIZATION_ID_LENGTH = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORGANIZATION_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
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
const isOrganizationId = (value: string) => (
  value.length > 0
  && value.length <= MAX_ORGANIZATION_ID_LENGTH
  && ORGANIZATION_ID_PATTERN.test(value)
);
const publicApplicationOrigin = (env: StorageEnvironment) => {
  const configured = env.STUCO_PUBLIC_APP_ORIGIN?.trim();
  if (!configured) throw new Error("The public application origin is not configured.");

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("The public application origin is invalid.");
  }
  const localHttp = env.NODE_ENV !== "production"
    && url.protocol === "http:"
    && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !localHttp)
    || url.username
    || url.password
    || url.pathname !== "/"
    || url.search
    || url.hash
  ) {
    throw new Error("The public application origin is invalid.");
  }
  return url.origin;
};

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

  const email = isObject(body) && typeof body.email === "string" ? body.email.trim() : "";
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return failure(400, "INVALID_EMAIL", "Enter a valid officer email address.");
  }

  try {
    const env = await getStorageEnvironment();
    const actor = await requireActiveMember(env, request);
    if (!isOrganizationId(actor.organizationId)) {
      return failure(500, "INVITATION_FAILED", "We could not create that invitation. Please try again.");
    }
    const result = await createOfficerInvitation(env, actor, email, publicApplicationOrigin(env));
    return json({ ok: true, ...result }, 201);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return failure(
        error.status,
        error.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
        error.message,
      );
    }
    if (error instanceof OfficerConflictError && error.code === "ACTIVE_MEMBER_EXISTS") {
      return failure(409, error.code, error.message);
    }
    return failure(500, "INVITATION_FAILED", "We could not create that invitation. Please try again.");
  }
}
