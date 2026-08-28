import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import { POST } from "../../app/api/analyses/route";

const file = (name: string, sheets: Record<string, unknown[][]>) => {
  const workbook = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([bytes], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
};
const validTeam = () => file("team.xlsx", { Commitments: [
  ["VOLUNTEER NAME", "DURATION (HRS)", "ATTENDANCE", "DATE AND TIME", "OPPORTUNITY", "VOLUNTEER EMAIL", "OPP ID"],
  ["Jordan", 24, "Validated", "2026-09-01", "Completed", "jordan@example.com", "1"],
] });
const validUpcoming = () => file("upcoming.xlsx", { "Opportunity Volunteers": [
  ["OPPORTUNITY", "DATE AND TIME", "DURATION", "EMAIL ADDRESS", "TEAMS", "STATUS"],
  ["Food Drive", "2026-09-12", 2, "jordan@example.com", "STUCO", "Active"],
] });
const validRoster = () => file("roster.xlsx", { Roster: [
  ["Student Name", "Email Address"],
  ["Jordan", "jordan@example.com"],
  ["No Activity", "none@example.com"],
] });
const request = (overrides?: (form: FormData) => void) => {
  const form = new FormData();
  form.set("teamReport", validTeam()); form.set("upcomingReport", validUpcoming());
  form.set("schoolYearStart", "2026-08-01"); form.set("schoolYearEnd", "2027-07-31"); form.set("capHours", "25");
  overrides?.(form);
  return new Request("http://local.test/api/analyses", { method: "POST", body: form });
};

describe("POST /api/analyses", () => {
  it("returns 200 with a real analysis", async () => {
    const response = await POST(request()); const body = await response.json();
    expect(response.status).toBe(200); expect(body.ok).toBe(true); expect(body.analysis.summary.flaggedOptionalEvents).toBe(1);
  });
  it("rejects missing files and invalid configuration", async () => {
    const response = await POST(request((form) => { form.delete("teamReport"); form.set("capHours", "0"); }));
    expect(response.status).toBe(400); expect((await response.json()).issues.length).toBeGreaterThan(0);
  });
  it("rejects unsupported file extensions", async () => {
    const response = await POST(request((form) => form.set("teamReport", new File(["bad"], "team.csv"))));
    expect(response.status).toBe(400); expect(JSON.stringify(await response.json())).toMatch(/xlsx/i);
  });
  it("rejects malformed workbook bytes", async () => {
    const response = await POST(request((form) => form.set("teamReport", new File(["bad"], "team.xlsx"))));
    expect(response.status).toBe(400); expect(JSON.stringify(await response.json())).toMatch(/workbook/i);
  });

  it("accepts an optional roster and returns roster analyses", async () => {
    const response = await POST(request((form) => form.set("rosterReport", validRoster()))); const body = await response.json();
    expect(response.status).toBe(200); expect(body.analysis.performance.students).toHaveLength(2);
    expect(body.analysis.teamMetrics).toMatchObject({ rosterSize: 2, activeVolunteers: 1, zeroHourVolunteers: 1 });
    expect(body.analysis.teamMetrics.periods.length).toBeGreaterThan(0);
  });

  it("omits roster analyses without an optional roster", async () => {
    const response = await POST(request()); const body = await response.json();
    expect(response.status).toBe(200); expect(body.analysis.performance).toBeUndefined(); expect(body.analysis.teamMetrics).toBeUndefined();
  });

  it("rejects an invalid optional roster", async () => {
    const response = await POST(request((form) => form.set("rosterReport", new File(["bad"], "roster.csv"))));
    expect(response.status).toBe(400); expect(JSON.stringify(await response.json())).toMatch(/Full Roster.*xlsx/i);
  });

  it("saves a valid analysis when History is selected", async () => {
    const objects = new Map<string, ArrayBuffer>();
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    const db = {
      prepare(sql: string) {
        const statement = { sql, values: [] as unknown[], bind(...values: unknown[]) { this.values = values; statements.push(this); return this; }, async first<T>() { return (sql.includes("memberships") ? { active: 1 } : null) as T | null; }, async all<T>() { return { results: [] as T[] }; }, async run() { return {}; } };
        return statement;
      },
      async batch() { return {}; },
    };
    (globalThis as typeof globalThis & { __STUCO_ENV__?: unknown }).__STUCO_ENV__ = { DB: db, UPLOADS: { put: async (key: string, value: ArrayBuffer) => { objects.set(key, value); }, delete: async (key: string) => { objects.delete(key); } }, STUCO_DEV_AUTH: "true", STUCO_DEV_ORGANIZATION_ID: "local-stuco", NODE_ENV: "development" };
    try {
      const response = await POST(request((form) => form.set("save", "true")));
      const body = await response.json();
      expect(response.status).toBe(201); expect(body.saved).toBe(true); expect(body.analysis.id).toEqual(expect.any(String));
      expect(objects.size).toBe(2); expect(statements.some(({ sql }) => sql.includes("INSERT INTO analyses"))).toBe(true);
    } finally {
      delete (globalThis as typeof globalThis & { __STUCO_ENV__?: unknown }).__STUCO_ENV__;
    }
  });
});
