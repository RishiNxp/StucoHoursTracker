# Task 2 review package

Base: working tree before Task 2 (commits unavailable)
Head: current working tree
Note: these tracked-file diffs also contain earlier approved roster changes; review only teamMetrics hunks required by the brief.

warning: in the working copy of 'app/analysis-types.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/analysis/service.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/analysis/service.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/api/analyses-route.test.ts', LF will be replaced by CRLF the next time Git touches it
diff --git a/app/analysis-types.ts b/app/analysis-types.ts
index eeab751..db98927 100644
--- a/app/analysis-types.ts
+++ b/app/analysis-types.ts
@@ -1,5 +1,6 @@
+import type { PerformanceResult, TeamMetricsResult } from "../src/analysis/types";
 export type AnalysisIssue = { code: string; message: string; sheet?: string; row?: number; column?: string };
 export type AnalysisDraft = { subject: string; body: string; copyText: string };
 export type AnalysisEvent = { volunteerKey: string; name: string; email: string | null; eventName: string; eventDate: string; durationHours: number; projectedHours: number; classification: "allowed" | "flagged" | "mandatory_exempt"; status: string | null; team: string | null; warning?: string; draft?: AnalysisDraft };
 export type AnalysisVolunteer = { volunteerKey: string; name: string; email: string | null; currentValidatedHours: number; warnings: string[]; events: AnalysisEvent[] };
-export type AnalysisViewModel = { configuration: { schoolYearStart: string; schoolYearEnd: string; schoolYearLabel: string; capHours: number }; summary: { volunteers: number; flaggedOptionalEvents: number; mandatoryExemptEvents: number; warnings: number }; volunteers: AnalysisVolunteer[]; issues: AnalysisIssue[] };
+export type AnalysisViewModel = { id?: string; createdAt?: string; createdBy?: string; configuration: { schoolYearStart: string; schoolYearEnd: string; schoolYearLabel: string; capHours: number }; summary: { volunteers: number; flaggedOptionalEvents: number; mandatoryExemptEvents: number; warnings: number }; volunteers: AnalysisVolunteer[]; performance?: PerformanceResult; teamMetrics?: TeamMetricsResult; issues: AnalysisIssue[] };
diff --git a/src/analysis/service.ts b/src/analysis/service.ts
index 0cd611d..16de533 100644
--- a/src/analysis/service.ts
+++ b/src/analysis/service.ts
@@ -1,12 +1,15 @@
 import { classifyVolunteerHours } from "./classify";
 import { buildVolunteerDraft, type Draft } from "./drafts";
-import { normalizeTeamReport, normalizeUpcomingReport } from "./normalize";
-import type { ClassificationResult, EventClassification, ValidationIssue } from "./types";
+import { normalizeRosterReport, normalizeTeamReport, normalizeUpcomingReport } from "./normalize";
+import { buildPerformanceResult } from "./performance";
+import { buildTeamMetrics } from "./team-metrics";
+import type { ClassificationResult, EventClassification, PerformanceResult, TeamMetricsResult, ValidationIssue } from "./types";
 import { parseWorkbook } from "./workbook";
 
 export type AnalyzeReportsInput = {
   teamReport: ArrayBuffer;
   upcomingReport: ArrayBuffer;
+  rosterReport?: ArrayBuffer;
   schoolYearStart: string;
   schoolYearEnd: string;
   capHours: number;
@@ -25,6 +28,8 @@ export type AnalyzeReportsResult = {
   configuration: { schoolYearStart: string; schoolYearEnd: string; schoolYearLabel: string; capHours: number };
   summary: ClassificationResult["summary"];
   volunteers: SerializedVolunteer[];
+  performance?: PerformanceResult;
+  teamMetrics?: TeamMetricsResult;
   issues: ValidationIssue[];
 };
 
@@ -35,7 +40,8 @@ export function analyzeReports(input: AnalyzeReportsInput): AnalyzeReportsResult
   const configuration = { schoolYearStart: input.schoolYearStart, schoolYearEnd: input.schoolYearEnd, schoolYearLabel: schoolYearLabel(input.schoolYearStart, input.schoolYearEnd), capHours: input.capHours };
   const history = normalizeTeamReport(parseWorkbook(input.teamReport));
   const upcoming = normalizeUpcomingReport(parseWorkbook(input.upcomingReport));
-  const issues = [...history.issues, ...upcoming.issues];
+  const roster = input.rosterReport ? normalizeRosterReport(parseWorkbook(input.rosterReport)) : undefined;
+  const issues = [...history.issues, ...upcoming.issues, ...(roster?.issues ?? [])];
   const seen = new Set<string>();
   for (const row of upcoming.rows) {
     const key = `${row.volunteerKey}|${row.eventName.toLowerCase()}|${row.eventDate.toISOString()}`;
@@ -44,9 +50,11 @@ export function analyzeReports(input: AnalyzeReportsInput): AnalyzeReportsResult
   }
   if (issues.length) return { configuration, summary: emptySummary, volunteers: [], issues };
 
+  const schoolYearStart = new Date(`${input.schoolYearStart}T00:00:00.000Z`);
+  const schoolYearEnd = new Date(`${input.schoolYearEnd}T23:59:59.999Z`);
   const result = classifyVolunteerHours({
-    schoolYearStart: new Date(`${input.schoolYearStart}T00:00:00.000Z`),
-    schoolYearEnd: new Date(`${input.schoolYearEnd}T23:59:59.999Z`),
+    schoolYearStart,
+    schoolYearEnd,
     capHours: input.capHours, history: history.rows, upcoming: upcoming.rows,
   });
   const volunteers = result.volunteers.map((volunteer) => ({
@@ -60,5 +68,7 @@ export function analyzeReports(input: AnalyzeReportsInput): AnalyzeReportsResult
       }) : undefined,
     })),
   }));
-  return { configuration, summary: result.summary, volunteers, issues: [] };
+  const performance = roster ? buildPerformanceResult(roster.rows, history.rows, schoolYearStart, schoolYearEnd) : undefined;
+  const teamMetrics = roster ? buildTeamMetrics(roster.rows, history.rows, schoolYearStart, schoolYearEnd) : undefined;
+  return { configuration, summary: result.summary, volunteers, performance, teamMetrics, issues: [] };
 }
diff --git a/tests/analysis/service.test.ts b/tests/analysis/service.test.ts
index b9eef60..3ecb791 100644
--- a/tests/analysis/service.test.ts
+++ b/tests/analysis/service.test.ts
@@ -15,6 +15,11 @@ const upcoming = () => bytes({ "Opportunity Volunteers": [
   ["OPPORTUNITY", "DATE AND TIME", "DURATION", "EMAIL ADDRESS", "TEAMS", "STATUS"],
   ["Food Drive", "2026-09-12", 2, "jordan@example.com", "STUCO", "Active"],
 ] });
+const roster = () => bytes({ Roster: [
+  ["Student Name", "Email Address"],
+  ["Jordan", "jordan@example.com"],
+  ["No Activity", "none@example.com"],
+] });
 
 describe("analyzeReports", () => {
   it("returns JSON-safe real results and a configurable draft", () => {
@@ -39,4 +44,18 @@ describe("analyzeReports", () => {
     const result = analyzeReports({ teamReport: team(), upcomingReport: report, schoolYearStart: "2026-08-01", schoolYearEnd: "2027-07-31", capHours: 25 });
     expect(result.volunteers.find((volunteer) => !volunteer.email)?.events[0].draft).toBeUndefined();
   });
+
+  it("adds roster performance while retaining zero-activity students", () => {
+    const result = analyzeReports({ teamReport: team(), upcomingReport: upcoming(), rosterReport: roster(), schoolYearStart: "2026-08-01", schoolYearEnd: "2027-07-31", capHours: 25 });
+    expect(result.performance?.students).toHaveLength(2);
+    expect(result.performance?.students.find((student) => student.name === "No Activity")?.validatedHours).toBe(0);
+    expect(result.teamMetrics).toMatchObject({ rosterSize: 2, activeVolunteers: 1, zeroHourVolunteers: 1 });
+    expect(result.teamMetrics?.periods.length).toBeGreaterThan(0);
+  });
+
+  it("omits roster-only results when no roster is provided", () => {
+    const result = analyzeReports({ teamReport: team(), upcomingReport: upcoming(), schoolYearStart: "2026-08-01", schoolYearEnd: "2027-07-31", capHours: 25 });
+    expect(result.performance).toBeUndefined();
+    expect(result.teamMetrics).toBeUndefined();
+  });
 });
diff --git a/tests/api/analyses-route.test.ts b/tests/api/analyses-route.test.ts
index f5162c9..c4e0a61 100644
--- a/tests/api/analyses-route.test.ts
+++ b/tests/api/analyses-route.test.ts
@@ -1,5 +1,7 @@
-import { describe, expect, it } from "vitest";
+import { describe, expect, it, vi } from "vitest";
 import * as XLSX from "xlsx";
+vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
+vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
 import { POST } from "../../app/api/analyses/route";
 
 const file = (name: string, sheets: Record<string, unknown[][]>) => {
@@ -16,6 +18,11 @@ const validUpcoming = () => file("upcoming.xlsx", { "Opportunity Volunteers": [
   ["OPPORTUNITY", "DATE AND TIME", "DURATION", "EMAIL ADDRESS", "TEAMS", "STATUS"],
   ["Food Drive", "2026-09-12", 2, "jordan@example.com", "STUCO", "Active"],
 ] });
+const validRoster = () => file("roster.xlsx", { Roster: [
+  ["Student Name", "Email Address"],
+  ["Jordan", "jordan@example.com"],
+  ["No Activity", "none@example.com"],
+] });
 const request = (overrides?: (form: FormData) => void) => {
   const form = new FormData();
   form.set("teamReport", validTeam()); form.set("upcomingReport", validUpcoming());
@@ -41,4 +48,42 @@ describe("POST /api/analyses", () => {
     const response = await POST(request((form) => form.set("teamReport", new File(["bad"], "team.xlsx"))));
     expect(response.status).toBe(400); expect(JSON.stringify(await response.json())).toMatch(/workbook/i);
   });
+
+  it("accepts an optional roster and returns roster analyses", async () => {
+    const response = await POST(request((form) => form.set("rosterReport", validRoster()))); const body = await response.json();
+    expect(response.status).toBe(200); expect(body.analysis.performance.students).toHaveLength(2);
+    expect(body.analysis.teamMetrics).toMatchObject({ rosterSize: 2, activeVolunteers: 1, zeroHourVolunteers: 1 });
+    expect(body.analysis.teamMetrics.periods.length).toBeGreaterThan(0);
+  });
+
+  it("omits roster analyses without an optional roster", async () => {
+    const response = await POST(request()); const body = await response.json();
+    expect(response.status).toBe(200); expect(body.analysis.performance).toBeUndefined(); expect(body.analysis.teamMetrics).toBeUndefined();
+  });
+
+  it("rejects an invalid optional roster", async () => {
+    const response = await POST(request((form) => form.set("rosterReport", new File(["bad"], "roster.csv"))));
+    expect(response.status).toBe(400); expect(JSON.stringify(await response.json())).toMatch(/Full Roster.*xlsx/i);
+  });
+
+  it("saves a valid analysis when History is selected", async () => {
+    const objects = new Map<string, ArrayBuffer>();
+    const statements: Array<{ sql: string; values: unknown[] }> = [];
+    const db = {
+      prepare(sql: string) {
+        const statement = { sql, values: [] as unknown[], bind(...values: unknown[]) { this.values = values; statements.push(this); return this; }, async first<T>() { return (sql.includes("memberships") ? { active: 1 } : null) as T | null; }, async all<T>() { return { results: [] as T[] }; }, async run() { return {}; } };
+        return statement;
+      },
+      async batch() { return {}; },
+    };
+    (globalThis as typeof globalThis & { __STUCO_ENV__?: unknown }).__STUCO_ENV__ = { DB: db, UPLOADS: { put: async (key: string, value: ArrayBuffer) => { objects.set(key, value); }, delete: async (key: string) => { objects.delete(key); } }, STUCO_DEV_AUTH: "true", STUCO_DEV_ORGANIZATION_ID: "local-stuco", NODE_ENV: "development" };
+    try {
+      const response = await POST(request((form) => form.set("save", "true")));
+      const body = await response.json();
+      expect(response.status).toBe(201); expect(body.saved).toBe(true); expect(body.analysis.id).toEqual(expect.any(String));
+      expect(objects.size).toBe(2); expect(statements.some(({ sql }) => sql.includes("INSERT INTO analyses"))).toBe(true);
+    } finally {
+      delete (globalThis as typeof globalThis & { __STUCO_ENV__?: unknown }).__STUCO_ENV__;
+    }
+  });
 });

