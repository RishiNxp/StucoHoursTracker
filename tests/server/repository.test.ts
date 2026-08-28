import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import { getAnalysis, requireActiveMember, saveAnalysis } from "../../src/server/repository";
import { AuthorizationError, type D1Database, type D1PreparedStatement, type R2Bucket, type StorageEnvironment } from "../../src/server/types";

class Prepared implements D1PreparedStatement {
  values: unknown[] = [];
  constructor(readonly sql: string, private readonly rows: unknown[] = []) {}
  bind(...values: unknown[]) { this.values = values; return this; }
  async first<T>() { return (this.rows[0] as T | undefined) ?? null; }
  async all<T>() { return { results: this.rows as T[] }; }
  async run() { return { success: true }; }
}

class FakeDb implements D1Database {
  statements: Prepared[] = [];
  constructor(private readonly failBatch = false) {}
  prepare(sql: string) { const statement = new Prepared(sql, sql.includes("memberships") ? [{ active: 1 }] : []); this.statements.push(statement); return statement; }
  async batch(statements: D1PreparedStatement[]) { this.statements.push(...(statements as Prepared[])); if (this.failBatch) throw new Error("database failure"); }
}

class FakeUploads implements R2Bucket {
  objects = new Map<string, ArrayBuffer>();
  async put(key: string, value: ArrayBuffer) { this.objects.set(key, value); }
  async delete(key: string) { this.objects.delete(key); }
}

const analysis = {
  configuration: { schoolYearStart: "2026-08-01", schoolYearEnd: "2027-07-31", schoolYearLabel: "2026–2027", capHours: 25 },
  summary: { volunteers: 1, flaggedOptionalEvents: 1, mandatoryExemptEvents: 0, warnings: 0 },
  volunteers: [{ volunteerKey: "jordan@example.com", name: "Jordan", email: "jordan@example.com", currentValidatedHours: 24, warnings: [], events: [] }],
  performance: { students: [{ volunteerKey: "jordan@example.com", name: "Jordan", email: "jordan@example.com", warnings: [], validatedHours: 24, completedOpportunities: 1, combinedScore: 100, group: "top" as const }], summary: { developing: 0, steady: 0, top: 1 }, boundaries: null },
  teamMetrics: { rosterSize: 1, totalHours: 24, participationRate: 100, averageHours: 24, medianHours: 24, activeVolunteers: 1, zeroHourVolunteers: 0, completedOpportunities: 1, minimumHours: 24, maximumHours: 24, periods: [{ startDate: "2026-08-01", endDate: "2026-08-14", periodHours: 24, cumulativeHours: 24 }] },
  issues: [],
};

const env = (db: FakeDb, uploads: FakeUploads): StorageEnvironment => ({ DB: db, UPLOADS: uploads, STUCO_DEV_AUTH: "true", STUCO_DEV_ORGANIZATION_ID: "local-stuco", NODE_ENV: "development" });

describe("persistence authorization and storage", () => {
  beforeEach(() => { delete (globalThis as typeof globalThis & { __STUCO_ENV__?: unknown }).__STUCO_ENV__; });

  it("requires an active organization membership", async () => {
    const db = new FakeDb();
    const actor = await requireActiveMember(env(db, new FakeUploads()), new Request("http://local.test"));
    expect(actor).toMatchObject({ userId: "local-demo", organizationId: "local-stuco" });
    expect(db.statements[0].values).toEqual(["local-stuco", "local-demo"]);
  });

  it("rejects access when storage bindings are unavailable", async () => {
    await expect(requireActiveMember({ DB: { prepare: () => new Prepared("", []), batch: async () => undefined } as unknown as D1Database, UPLOADS: new FakeUploads(), NODE_ENV: "production" }, new Request("http://local.test"))).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("stores both source workbooks and writes an immutable analysis snapshot", async () => {
    const db = new FakeDb(); const uploads = new FakeUploads();
    const saved = await saveAnalysis(env(db, uploads), { userId: "local-demo", email: "demo@stuco.local", displayName: "Local Demo Officer", organizationId: "local-stuco" }, {
      teamReport: new TextEncoder().encode("team").buffer, upcomingReport: new TextEncoder().encode("upcoming").buffer,
      teamFilename: "team.xlsx", upcomingFilename: "upcoming.xlsx", analysis,
    });
    expect(saved.volunteerCount).toBe(1);
    expect(uploads.objects.size).toBe(2);
    expect(db.statements.some((statement) => statement.sql.startsWith("INSERT INTO analyses"))).toBe(true);
    expect(db.statements.some((statement) => statement.sql.startsWith("INSERT INTO audit_events"))).toBe(true);
  });

  it("stores an optional roster and version 3 performance and team metrics snapshot", async () => {
    const db = new FakeDb(); const uploads = new FakeUploads();
    await saveAnalysis(env(db, uploads), { userId: "local-demo", email: "demo@stuco.local", displayName: "Local Demo Officer", organizationId: "local-stuco" }, {
      teamReport: new TextEncoder().encode("team").buffer, upcomingReport: new TextEncoder().encode("upcoming").buffer,
      rosterReport: new TextEncoder().encode("roster").buffer, teamFilename: "team.xlsx", upcomingFilename: "upcoming.xlsx", rosterFilename: "roster.xlsx", analysis,
    });
    expect(uploads.objects.size).toBe(3);
    expect(db.statements.some((statement) => statement.sql.startsWith("INSERT INTO uploads") && statement.values[2] === "roster_report")).toBe(true);
    const insert = db.statements.find((statement) => statement.sql.startsWith("INSERT INTO analyses"));
    expect(JSON.parse(String(insert?.values[8]))).toMatchObject({ snapshotVersion: 3, performance: analysis.performance, teamMetrics: analysis.teamMetrics });
  });

  it("reads version 1 array-only result snapshots without team metrics", async () => {
    const db = { prepare: (sql: string) => new Prepared(sql, sql.includes("FROM analyses") ? [{ id: "old", created_at: Date.now(), created_by: "Officer", configuration_json: JSON.stringify(analysis.configuration), summary_json: JSON.stringify(analysis.summary), results_json: JSON.stringify(analysis.volunteers), team_upload_id: null, upcoming_upload_id: null, roster_upload_id: null }] : []) , batch: async () => undefined } as D1Database;
    const saved = await getAnalysis({ DB: db, UPLOADS: new FakeUploads() }, { userId: "u", email: "u@example.com", displayName: "Officer", organizationId: "org" }, "old");
    expect(saved?.volunteers).toEqual(analysis.volunteers);
    expect(saved?.performance).toBeUndefined();
    expect(saved?.teamMetrics).toBeUndefined();
  });

  it("reads version 2 snapshots without team metrics", async () => {
    const db = { prepare: (sql: string) => new Prepared(sql, sql.includes("FROM analyses") ? [{ id: "version-2", created_at: Date.now(), created_by: "Officer", configuration_json: JSON.stringify(analysis.configuration), summary_json: JSON.stringify(analysis.summary), results_json: JSON.stringify({ snapshotVersion: 2, volunteers: analysis.volunteers, performance: analysis.performance }), team_upload_id: null, upcoming_upload_id: null, roster_upload_id: null }] : []) , batch: async () => undefined } as D1Database;
    const saved = await getAnalysis({ DB: db, UPLOADS: new FakeUploads() }, { userId: "u", email: "u@example.com", displayName: "Officer", organizationId: "org" }, "version-2");
    expect(saved?.volunteers).toEqual(analysis.volunteers);
    expect(saved?.performance).toEqual(analysis.performance);
    expect(saved?.teamMetrics).toBeUndefined();
  });

  it("reads version 3 snapshots with preserved team metrics", async () => {
    const db = { prepare: (sql: string) => new Prepared(sql, sql.includes("FROM analyses") ? [{ id: "version-3", created_at: Date.now(), created_by: "Officer", configuration_json: JSON.stringify(analysis.configuration), summary_json: JSON.stringify(analysis.summary), results_json: JSON.stringify({ snapshotVersion: 3, volunteers: analysis.volunteers, performance: analysis.performance, teamMetrics: analysis.teamMetrics }), team_upload_id: null, upcoming_upload_id: null, roster_upload_id: null }] : []) , batch: async () => undefined } as D1Database;
    const saved = await getAnalysis({ DB: db, UPLOADS: new FakeUploads() }, { userId: "u", email: "u@example.com", displayName: "Officer", organizationId: "org" }, "version-3");
    expect(saved?.volunteers).toEqual(analysis.volunteers);
    expect(saved?.performance).toEqual(analysis.performance);
    expect(saved?.teamMetrics).toEqual(analysis.teamMetrics);
  });

  it("cleans up all uploaded files when the database write fails", async () => {
    const uploads = new FakeUploads();
    await expect(saveAnalysis(env(new FakeDb(true), uploads), { userId: "local-demo", email: "demo@stuco.local", displayName: "Local Demo Officer", organizationId: "local-stuco" }, {
      teamReport: new TextEncoder().encode("team").buffer, upcomingReport: new TextEncoder().encode("upcoming").buffer, rosterReport: new TextEncoder().encode("roster").buffer,
      teamFilename: "team.xlsx", upcomingFilename: "upcoming.xlsx", rosterFilename: "roster.xlsx", analysis,
    })).rejects.toThrow("database failure");
    expect(uploads.objects.size).toBe(0);
  });
});
