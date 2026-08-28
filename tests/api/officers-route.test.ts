import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  D1Database,
  D1PreparedStatement,
  R2Bucket,
  StorageEnvironment,
} from "../../src/server/types";

const headersMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
}));

import { GET as listOfficersRoute } from "../../app/api/officers/route";
import { POST as createInvitationRoute } from "../../app/api/officers/invitations/route";
import { POST as acceptInvitationRoute } from "../../app/api/officers/invitations/accept/route";
import { POST as deactivateOfficerRoute } from "../../app/api/officers/[membershipId]/deactivate/route";

type QueryMode = "first" | "all";
type QueryHandler = (sql: string, values: unknown[], mode: QueryMode) => unknown;
type BatchHandler = (statements: StubPreparedStatement[]) => unknown;
type TestStorageEnvironment = StorageEnvironment & { STUCO_PUBLIC_APP_ORIGIN?: string };

class StubPreparedStatement implements D1PreparedStatement {
  values: unknown[] = [];

  constructor(
    private readonly database: StubDatabase,
    readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<T>() {
    return this.database.query(this.sql, this.values, "first") as T | null;
  }

  async all<T>() {
    return { results: this.database.query(this.sql, this.values, "all") as T[] };
  }

  async run() {
    throw new Error("Route tests do not execute standalone D1 mutations.");
  }
}

class StubDatabase implements D1Database {
  constructor(
    private readonly queryHandler: QueryHandler,
    private readonly batchHandler: BatchHandler = () => [],
  ) {}

  prepare(sql: string) {
    return new StubPreparedStatement(this, sql);
  }

  async batch(statements: D1PreparedStatement[]) {
    return this.batchHandler(statements as StubPreparedStatement[]);
  }

  query(sql: string, values: unknown[], mode: QueryMode) {
    return this.queryHandler(sql.replace(/\s+/g, " ").trim(), values, mode);
  }
}

const uploads: R2Bucket = {
  async put() { return {}; },
  async delete() { return {}; },
};

const setEnvironment = (database: D1Database, overrides: Partial<TestStorageEnvironment> = {}) => {
  (globalThis as typeof globalThis & { __STUCO_ENV__?: TestStorageEnvironment }).__STUCO_ENV__ = {
    DB: database,
    UPLOADS: uploads,
    ORGANIZATION_ID: "org-a",
    NODE_ENV: "production",
    STUCO_PUBLIC_APP_ORIGIN: "https://stuco.example",
    ...overrides,
  };
};

const signIn = (email = "officer@example.edu", userId = "user-officer") => {
  headersMock.mockResolvedValue(new Headers({
    "oai-authenticated-user-id": userId,
    "oai-authenticated-user-email": email,
  }));
};

const activeMemberQuery = (
  sql: string,
  values: unknown[],
  expectedOrganization = "org-a",
  expectedUser = "user-officer",
) => {
  if (!sql.startsWith("SELECT active FROM memberships")) return undefined;
  return values[0] === expectedOrganization && values[1] === expectedUser ? { active: 1 } : null;
};

const jsonRequest = (url: string, body?: unknown, contentType = "application/json") => new Request(url, {
  method: "POST",
  headers: contentType ? { "content-type": contentType } : undefined,
  body: body === undefined ? undefined : JSON.stringify(body),
});

const malformedRequest = (url: string) => new Request(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{not-json",
});

const mutationResult = (changes: number) => ({ success: true, meta: { changes } });
const exampleEnvironmentValue = (name: string) => {
  const line = readFileSync(new URL("../../.env.example", import.meta.url), "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));
  return line?.slice(name.length + 1);
};

beforeEach(() => {
  headersMock.mockReset();
  headersMock.mockResolvedValue(new Headers());
  delete (globalThis as typeof globalThis & { __STUCO_ENV__?: StorageEnvironment }).__STUCO_ENV__;
});

describe("GET /api/officers", () => {
  it("returns an organization-scoped officers snapshot for an active member", async () => {
    signIn();
    setEnvironment(new StubDatabase((sql, values, mode) => {
      const active = activeMemberQuery(sql, values);
      if (active !== undefined) return active;
      if (mode === "all" && sql.includes("FROM memberships")) {
        if (values[0] !== "org-a") throw new Error("Membership list was not organization-scoped.");
        return [{
          id: "membership-1",
          user_id: "user-officer",
          email: "officer@example.edu",
          active: 1,
          created_at: Date.parse("2026-08-01T00:00:00.000Z"),
          updated_at: null,
          deactivated_at: null,
        }];
      }
      if (mode === "all" && sql.includes("FROM invitations")) {
        if (values[0] !== "org-a") throw new Error("Invitation list was not organization-scoped.");
        return [{
          id: "invitation-1",
          email: "invitee@example.edu",
          expires_at: Date.now() + 60_000,
          created_at: Date.parse("2026-08-20T00:00:00.000Z"),
          created_by: "user-officer",
        }];
      }
      throw new Error(`Unexpected ${mode} query: ${sql}`);
    }));

    const response = await listOfficersRoute(new Request("https://stuco.example/api/officers"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      officers: {
        memberships: [{
          id: "membership-1",
          userId: "user-officer",
          email: "officer@example.edu",
          active: true,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: null,
          deactivatedAt: null,
        }],
        invitations: [{
          id: "invitation-1",
          email: "invitee@example.edu",
          status: "pending",
          expiresAt: expect.any(String),
          createdAt: "2026-08-20T00:00:00.000Z",
          createdBy: "user-officer",
        }],
      },
    });
  });

  it("returns a generic failure without leaking storage details", async () => {
    signIn();
    setEnvironment(new StubDatabase((sql, values) => {
      const active = activeMemberQuery(sql, values);
      if (active !== undefined) return active;
      throw new Error("secret database connection details");
    }));

    const response = await listOfficersRoute(new Request("https://stuco.example/api/officers"));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).toContain("OFFICERS_FAILED");
    expect(text).not.toContain("secret database connection details");
  });
});

describe("active-member authorization", () => {
  it.each([
    ["list", () => listOfficersRoute(new Request("https://stuco.example/api/officers"))],
    ["invite", () => createInvitationRoute(jsonRequest("https://stuco.example/api/officers/invitations", { email: "new@example.edu" }))],
    ["deactivate", () => deactivateOfficerRoute(
      jsonRequest("https://stuco.example/api/officers/membership-1/deactivate"),
      { params: Promise.resolve({ membershipId: "membership-1" }) },
    )],
  ])("rejects an inactive or nonmember identity before %s", async (_label, callRoute) => {
    signIn();
    setEnvironment(new StubDatabase((sql) => {
      if (sql.startsWith("SELECT active FROM memberships")) return { active: 0 };
      throw new Error("The route continued after failed authorization.");
    }));

    const response = await callRoute();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.issues).toEqual([{ code: "FORBIDDEN", message: expect.any(String) }]);
  });

  it.each([
    ["list", () => listOfficersRoute(new Request("https://stuco.example/api/officers"))],
    ["invite", () => createInvitationRoute(jsonRequest("https://stuco.example/api/officers/invitations", { email: "new@example.edu" }))],
    ["deactivate", () => deactivateOfficerRoute(
      jsonRequest("https://stuco.example/api/officers/membership-1/deactivate"),
      { params: Promise.resolve({ membershipId: "membership-1" }) },
    )],
  ])("returns 401 for an unauthenticated identity before %s", async (_label, callRoute) => {
    setEnvironment(new StubDatabase(() => {
      throw new Error("Unauthenticated management reached storage.");
    }));

    const response = await callRoute();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.issues).toEqual([{ code: "UNAUTHENTICATED", message: expect.any(String) }]);
  });
});

describe("POST /api/officers/invitations", () => {
  it("rejects a non-JSON request", async () => {
    const response = await createInvitationRoute(jsonRequest(
      "https://stuco.example/api/officers/invitations",
      { email: "new@example.edu" },
      "text/plain",
    ));

    expect(response.status).toBe(400);
    expect((await response.json()).issues[0].code).toBe("INVALID_CONTENT_TYPE");
  });

  it("rejects malformed JSON", async () => {
    const response = await createInvitationRoute(malformedRequest("https://stuco.example/api/officers/invitations"));

    expect(response.status).toBe(400);
    expect((await response.json()).issues[0].code).toBe("INVALID_JSON");
  });

  it.each([
    ["not-an-email"],
    ["a".repeat(245) + "@example.edu"],
  ])("rejects an invalid or overlong email", async (email) => {
    const response = await createInvitationRoute(jsonRequest(
      "https://stuco.example/api/officers/invitations",
      { email },
    ));

    expect(response.status).toBe(400);
    expect((await response.json()).issues[0].code).toBe("INVALID_EMAIL");
  });

  it("creates a normalized seven-day invitation for an active officer", async () => {
    signIn();
    setEnvironment(new StubDatabase(
      (sql, values) => {
        const active = activeMemberQuery(sql, values);
        if (active !== undefined) return active;
        if (sql.includes("lower(trim(email)) = ?") && sql.includes("active = 1")) {
          if (values[0] !== "org-a" || values[1] !== "new@example.edu") {
            throw new Error("Invitation lookup was not scoped or normalized.");
          }
          return null;
        }
        throw new Error(`Unexpected query: ${sql}`);
      },
      () => [mutationResult(0), mutationResult(1), mutationResult(1)],
    ));

    const response = await createInvitationRoute(jsonRequest(
      "https://attacker.invalid/api/officers/invitations",
      { email: " New@Example.edu " },
      "Application/JSON; charset=utf-8",
    ));
    const body = await response.json();
    const invitationUrl = new URL(body.invitationUrl);

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.invitation).toMatchObject({ email: "new@example.edu", status: "pending" });
    expect(invitationUrl.origin).toBe("https://stuco.example");
    expect(invitationUrl.pathname).toBe("/invite");
    expect(invitationUrl.searchParams.get("organizationId")).toBe("org-a");
    expect(invitationUrl.searchParams.get("token")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Date.parse(body.invitation.expiresAt) - Date.parse(body.invitation.createdAt)).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("creates a trusted local invitation when development copies the example origin configuration", async () => {
    const configuredOrigin = exampleEnvironmentValue("STUCO_PUBLIC_APP_ORIGIN");
    signIn();
    setEnvironment(new StubDatabase(
      (sql, values) => {
        const active = activeMemberQuery(sql, values);
        if (active !== undefined) return active;
        if (sql.includes("lower(trim(email)) = ?") && sql.includes("active = 1")) return null;
        throw new Error(`Unexpected query: ${sql}`);
      },
      () => [mutationResult(0), mutationResult(1), mutationResult(1)],
    ), {
      NODE_ENV: "development",
      STUCO_PUBLIC_APP_ORIGIN: configuredOrigin,
    });

    const response = await createInvitationRoute(jsonRequest(
      "https://attacker.invalid/api/officers/invitations",
      { email: "local@example.edu" },
    ));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(new URL(body.invitationUrl).origin).toBe("http://localhost:3000");
  });

  it.each([
    ["missing", undefined],
    ["path-bearing", "https://stuco.example/not-an-origin"],
    ["credential-bearing", "https://user@stuco.example"],
    ["insecure production", "http://stuco.example"],
  ])("fails closed before mutation when the configured public origin is %s", async (_name, configuredOrigin) => {
    let batchCalls = 0;
    signIn();
    setEnvironment(new StubDatabase(
      (sql, values) => {
        const active = activeMemberQuery(sql, values);
        if (active !== undefined) return active;
        if (sql.includes("lower(trim(email)) = ?") && sql.includes("active = 1")) return null;
        throw new Error(`Unexpected query: ${sql}`);
      },
      () => {
        batchCalls += 1;
        return [mutationResult(0), mutationResult(1), mutationResult(1)];
      },
    ), { STUCO_PUBLIC_APP_ORIGIN: configuredOrigin });

    const response = await createInvitationRoute(jsonRequest(
      "https://attacker.invalid/api/officers/invitations",
      { email: "new@example.edu" },
    ));

    expect(response.status).toBe(500);
    expect((await response.json()).issues[0].code).toBe("INVITATION_FAILED");
    expect(batchCalls).toBe(0);
  });

  it("refuses to generate a link whose configured organization ID cannot pass acceptance validation", async () => {
    let batchCalls = 0;
    const invalidOrganizationId = "org/invalid";
    signIn();
    setEnvironment(new StubDatabase(
      (sql) => {
        if (sql.startsWith("SELECT active FROM memberships")) return { active: 1 };
        if (sql.includes("lower(trim(email)) = ?") && sql.includes("active = 1")) return null;
        throw new Error(`Unexpected query: ${sql}`);
      },
      () => {
        batchCalls += 1;
        return [mutationResult(0), mutationResult(1), mutationResult(1)];
      },
    ), { ORGANIZATION_ID: invalidOrganizationId });

    const response = await createInvitationRoute(jsonRequest(
      "https://attacker.invalid/api/officers/invitations",
      { email: "new@example.edu" },
    ));

    expect(response.status).toBe(500);
    expect((await response.json()).issues[0].code).toBe("INVITATION_FAILED");
    expect(batchCalls).toBe(0);
  });

  it("maps an existing active officer to a safe conflict", async () => {
    signIn();
    setEnvironment(new StubDatabase((sql, values) => {
      const active = activeMemberQuery(sql, values);
      if (active !== undefined) return active;
      if (sql.includes("lower(trim(email)) = ?") && sql.includes("active = 1")) return { id: "membership-existing" };
      throw new Error(`Unexpected query: ${sql}`);
    }));

    const response = await createInvitationRoute(jsonRequest(
      "https://stuco.example/api/officers/invitations",
      { email: "officer@example.edu" },
    ));

    expect(response.status).toBe(409);
    expect((await response.json()).issues[0]).toEqual({
      code: "ACTIVE_MEMBER_EXISTS",
      message: expect.any(String),
    });
  });
});

describe("POST /api/officers/invitations/accept", () => {
  it("rejects unauthenticated platform identities", async () => {
    setEnvironment(new StubDatabase(() => {
      throw new Error("Unauthenticated acceptance reached storage.");
    }));

    const response = await acceptInvitationRoute(jsonRequest(
      "https://stuco.example/api/officers/invitations/accept",
      { organizationId: "org-invited", token: "a".repeat(43) },
    ));

    expect(response.status).toBe(401);
    expect((await response.json()).issues[0].code).toBe("UNAUTHENTICATED");
  });

  it("rejects malformed JSON and missing or malformed tokens", async () => {
    const malformedResponse = await acceptInvitationRoute(malformedRequest(
      "https://stuco.example/api/officers/invitations/accept",
    ));
    const missingResponse = await acceptInvitationRoute(jsonRequest(
      "https://stuco.example/api/officers/invitations/accept",
      { organizationId: "org-invited" },
    ));

    expect(malformedResponse.status).toBe(400);
    expect((await malformedResponse.json()).issues[0].code).toBe("INVALID_JSON");
    expect(missingResponse.status).toBe(400);
    expect((await missingResponse.json()).issues[0].code).toBe("INVALID_TOKEN");
  });

  it.each([
    ["overlong organization ID", { organizationId: "o".repeat(129), token: "a".repeat(43) }, "INVALID_ORGANIZATION"],
    ["invalid organization ID pattern", { organizationId: "org/invited", token: "a".repeat(43) }, "INVALID_ORGANIZATION"],
    ["overlong token", { organizationId: "org-invited", token: "a".repeat(513) }, "INVALID_TOKEN"],
    ["invalid token pattern", { organizationId: "org-invited", token: `${"a".repeat(42)}.` }, "INVALID_TOKEN"],
  ])("rejects an %s before authentication", async (_name, body, code) => {
    const response = await acceptInvitationRoute(jsonRequest(
      "https://stuco.example/api/officers/invitations/accept",
      body,
    ));

    expect(response.status).toBe(400);
    expect((await response.json()).issues[0].code).toBe(code);
  });

  it("accepts with platform identity and the explicit invitation organization without requiring membership", async () => {
    const rawToken = "a".repeat(43);
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    signIn("invitee@example.edu", "user-invitee");
    setEnvironment(new StubDatabase(
      (sql, values) => {
        if (sql.startsWith("SELECT active FROM memberships")) {
          throw new Error("Invitation acceptance must not require existing membership.");
        }
        if (sql.includes("FROM invitations") && sql.includes("token_hash = ?")) {
          if (values[0] !== "org-invited" || values[1] !== tokenHash) return null;
          return {
            id: "invitation-accept",
            email: "invitee@example.edu",
            token_hash: tokenHash,
            expires_at: Date.now() + 60_000,
            accepted_at: null,
            created_at: Date.parse("2026-08-20T00:00:00.000Z"),
            created_by: "user-officer",
            invalidated_at: null,
          };
        }
        if (sql.includes("FROM memberships") && sql.includes("lower(trim(email)) = ?")) {
          if (values[0] !== "org-invited") throw new Error("Acceptance membership lookup used the configured organization.");
          return null;
        }
        throw new Error(`Unexpected query: ${sql}`);
      },
      () => [mutationResult(1), mutationResult(1), mutationResult(1), mutationResult(0)],
    ), { ORGANIZATION_ID: "org-configured-elsewhere" });

    const response = await acceptInvitationRoute(jsonRequest(
      "https://stuco.example/api/officers/invitations/accept",
      { organizationId: "org-invited", token: rawToken },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      membership: {
        email: "invitee@example.edu",
        userId: "user-invitee",
        active: true,
      },
    });
  });

  it("maps invitation email mismatch to forbidden without leaking another account", async () => {
    const rawToken = "b".repeat(43);
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    signIn("wrong@example.edu", "user-wrong");
    setEnvironment(new StubDatabase((sql) => {
      if (sql.includes("FROM invitations") && sql.includes("token_hash = ?")) {
        return {
          id: "invitation-mismatch",
          email: "intended@example.edu",
          token_hash: tokenHash,
          expires_at: Date.now() + 60_000,
          accepted_at: null,
          created_at: Date.now() - 60_000,
          created_by: "user-officer",
          invalidated_at: null,
        };
      }
      throw new Error(`Unexpected query: ${sql}`);
    }));

    const response = await acceptInvitationRoute(jsonRequest(
      "https://stuco.example/api/officers/invitations/accept",
      { organizationId: "org-invited", token: rawToken },
    ));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.issues).toEqual([{ code: "INVITATION_EMAIL_MISMATCH", message: expect.any(String) }]);
    expect(JSON.stringify(body)).not.toContain("intended@example.edu");
  });

  it("maps expired, reused, or unknown invitations to conflict", async () => {
    signIn("invitee@example.edu", "user-invitee");
    setEnvironment(new StubDatabase((sql) => {
      if (sql.includes("FROM invitations") && sql.includes("token_hash = ?")) return null;
      throw new Error(`Unexpected query: ${sql}`);
    }));

    const response = await acceptInvitationRoute(jsonRequest(
      "https://stuco.example/api/officers/invitations/accept",
      { organizationId: "org-invited", token: "c".repeat(43) },
    ));

    expect(response.status).toBe(409);
    expect((await response.json()).issues[0].code).toBe("INVITATION_INVALID");
  });
});

describe("POST /api/officers/:membershipId/deactivate", () => {
  it("requires JSON even though the mutation has no request fields", async () => {
    const response = await deactivateOfficerRoute(
      jsonRequest("https://stuco.example/api/officers/membership-1/deactivate", undefined, ""),
      { params: Promise.resolve({ membershipId: "membership-1" }) },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).issues[0].code).toBe("INVALID_CONTENT_TYPE");
  });

  it("deactivates a scoped membership for an active officer", async () => {
    signIn();
    setEnvironment(new StubDatabase(
      (sql, values) => {
        const active = activeMemberQuery(sql, values);
        if (active !== undefined) return active;
        throw new Error(`Unexpected query: ${sql}`);
      },
      (statements) => {
        if (!statements.every(({ values }) => values.includes("org-a") && values.includes("membership-target"))) {
          throw new Error("Deactivation batch was not scoped to the actor organization and target.");
        }
        return [mutationResult(1), mutationResult(1)];
      },
    ));

    const response = await deactivateOfficerRoute(
      jsonRequest("https://stuco.example/api/officers/membership-target/deactivate"),
      { params: Promise.resolve({ membershipId: "membership-target" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("maps final-officer protection to conflict", async () => {
    signIn();
    setEnvironment(new StubDatabase(
      (sql, values) => {
        const active = activeMemberQuery(sql, values);
        if (active !== undefined) return active;
        if (sql.includes("SELECT id, active FROM memberships")) return { id: "membership-last", active: 1 };
        throw new Error(`Unexpected query: ${sql}`);
      },
      () => [mutationResult(0), mutationResult(0)],
    ));

    const response = await deactivateOfficerRoute(
      jsonRequest("https://stuco.example/api/officers/membership-last/deactivate"),
      { params: Promise.resolve({ membershipId: "membership-last" }) },
    );

    expect(response.status).toBe(409);
    expect((await response.json()).issues[0].code).toBe("LAST_ACTIVE_OFFICER");
  });

  it("maps inactive, missing, and cross-organization memberships to not found", async () => {
    signIn();
    setEnvironment(new StubDatabase(
      (sql, values) => {
        const active = activeMemberQuery(sql, values);
        if (active !== undefined) return active;
        if (sql.includes("SELECT id, active FROM memberships")) {
          if (values[0] !== "org-a") throw new Error("Fallback target lookup was not organization-scoped.");
          return null;
        }
        throw new Error(`Unexpected query: ${sql}`);
      },
      () => [mutationResult(0), mutationResult(0)],
    ));

    const response = await deactivateOfficerRoute(
      jsonRequest("https://stuco.example/api/officers/membership-elsewhere/deactivate"),
      { params: Promise.resolve({ membershipId: "membership-elsewhere" }) },
    );

    expect(response.status).toBe(404);
    expect((await response.json()).issues[0].code).toBe("NOT_FOUND");
  });
});
