# Task 1 fix round 1 current package

Finding under review: minimumHours was forced to zero for all-active rosters; missing covering test.

warning: in the working copy of 'src/analysis/team-metrics.ts', LF will be replaced by CRLF the next time Git touches it
diff --git a/src/analysis/team-metrics.ts b/src/analysis/team-metrics.ts
new file mode 100644
index 0000000..c0204b5
--- /dev/null
+++ b/src/analysis/team-metrics.ts
@@ -0,0 +1,84 @@
+import type { HistoryRow, RosterStudent, TeamMetricPeriod, TeamMetricsResult } from "./types";
+
+const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
+const roundHundredths = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
+const opportunityKey = (row: HistoryRow) => row.eventId ?? `${row.eventName.trim().toLowerCase()}|${row.eventDate.toISOString()}`;
+const inRange = (date: Date, start: Date, end: Date) => date >= start && date <= end;
+const dateLabel = (date: Date) => date.toISOString().slice(0, 10);
+const addUtcDays = (date: Date, days: number) => new Date(Date.UTC(
+  date.getUTCFullYear(),
+  date.getUTCMonth(),
+  date.getUTCDate() + days,
+  date.getUTCHours(),
+  date.getUTCMinutes(),
+  date.getUTCSeconds(),
+  date.getUTCMilliseconds(),
+));
+
+const appendRow = (index: Map<string, HistoryRow[]>, key: string, row: HistoryRow) => {
+  index.set(key, [...(index.get(key) ?? []), row]);
+};
+
+const matchedRowsForStudent = (student: RosterStudent, byEmail: Map<string, HistoryRow[]>, byName: Map<string, HistoryRow[]>) => {
+  let rows = student.email ? (byEmail.get(student.email.toLowerCase()) ?? []) : [];
+  if (!rows.length) {
+    const nameRows = byName.get(normalizeName(student.name)) ?? [];
+    const identities = new Set(nameRows.map((row) => row.email ?? row.volunteerKey));
+    if (identities.size <= 1) rows = nameRows;
+  }
+  return rows;
+};
+
+export function buildTeamMetrics(roster: RosterStudent[], history: HistoryRow[], schoolYearStart: Date, schoolYearEnd: Date): TeamMetricsResult {
+  const eligible = history.filter((row) => row.attendance.trim().toLowerCase() === "validated" && inRange(row.eventDate, schoolYearStart, schoolYearEnd));
+  const byEmail = new Map<string, HistoryRow[]>();
+  const byName = new Map<string, HistoryRow[]>();
+  for (const row of eligible) {
+    if (row.email) appendRow(byEmail, row.email.toLowerCase(), row);
+    appendRow(byName, normalizeName(row.name), row);
+  }
+
+  const rowsByStudent = roster.map((student) => matchedRowsForStudent(student, byEmail, byName));
+  const matchedRows = rowsByStudent.flat();
+  const hoursByStudent = rowsByStudent.map((rows) => roundHundredths(rows.reduce((sum, row) => sum + row.hours, 0)));
+  const totalHours = roundHundredths(hoursByStudent.reduce((sum, hours) => sum + hours, 0));
+  const activeVolunteers = hoursByStudent.filter((hours) => hours > 0).length;
+  const sortedHours = [...hoursByStudent].sort((a, b) => a - b);
+  const middle = Math.floor(sortedHours.length / 2);
+  const medianHours = sortedHours.length === 0 ? 0 : roundHundredths(sortedHours.length % 2 === 1 ? sortedHours[middle] : (sortedHours[middle - 1] + sortedHours[middle]) / 2);
+  const periods = buildPeriods(matchedRows, schoolYearStart, schoolYearEnd);
+
+  return {
+    rosterSize: roster.length,
+    totalHours,
+    participationRate: roundHundredths(roster.length ? (activeVolunteers / roster.length) * 100 : 0),
+    averageHours: roundHundredths(roster.length ? totalHours / roster.length : 0),
+    medianHours,
+    activeVolunteers,
+    zeroHourVolunteers: roster.length - activeVolunteers,
+    completedOpportunities: new Set(matchedRows.map(opportunityKey)).size,
+    minimumHours: hoursByStudent.length ? Math.min(...hoursByStudent) : 0,
+    maximumHours: Math.max(0, ...hoursByStudent),
+    periods,
+  };
+}
+
+function buildPeriods(rows: HistoryRow[], schoolYearStart: Date, schoolYearEnd: Date): TeamMetricPeriod[] {
+  const periods: TeamMetricPeriod[] = [];
+  const inclusiveEnd = new Date(schoolYearEnd.getTime() + 1);
+  let cursor = schoolYearStart;
+  let cumulativeHours = 0;
+  while (cursor < inclusiveEnd) {
+    const exclusiveEnd = new Date(Math.min(addUtcDays(cursor, 14).getTime(), inclusiveEnd.getTime()));
+    const periodHours = roundHundredths(rows.filter((row) => row.eventDate >= cursor && row.eventDate < exclusiveEnd).reduce((sum, row) => sum + row.hours, 0));
+    cumulativeHours = roundHundredths(cumulativeHours + periodHours);
+    periods.push({
+      startDate: dateLabel(cursor),
+      endDate: dateLabel(new Date(exclusiveEnd.getTime() - 1)),
+      periodHours,
+      cumulativeHours,
+    });
+    cursor = exclusiveEnd;
+  }
+  return periods;
+}

warning: in the working copy of 'tests/analysis/team-metrics.test.ts', LF will be replaced by CRLF the next time Git touches it
diff --git a/tests/analysis/team-metrics.test.ts b/tests/analysis/team-metrics.test.ts
new file mode 100644
index 0000000..b91edc5
--- /dev/null
+++ b/tests/analysis/team-metrics.test.ts
@@ -0,0 +1,133 @@
+import { describe, expect, it } from "vitest";
+import { buildTeamMetrics } from "../../src/analysis/team-metrics";
+import type { HistoryRow, RosterStudent } from "../../src/analysis/types";
+
+const start = new Date("2026-08-01T00:00:00.000Z");
+const end = new Date("2027-07-31T23:59:59.999Z");
+const roster = (...students: Array<[string, string | null]>) => students.map(([name, email]) => ({ volunteerKey: email ?? name.toLowerCase(), name, email, warnings: [] })) satisfies RosterStudent[];
+const validated = (name: string, hours: number, eventId: string | null, options: Partial<HistoryRow> = {}): HistoryRow => ({
+  volunteerKey: options.email ?? name.toLowerCase(),
+  name,
+  email: null,
+  hours,
+  attendance: "Validated",
+  eventName: "Volunteer Event",
+  eventId,
+  eventDate: start,
+  ...options,
+});
+
+describe("buildTeamMetrics", () => {
+  it("aggregates roster-wide metrics and fourteen-day periods", () => {
+    const result = buildTeamMetrics([
+      ...roster(["A", null], ["B", null], ["C", null]),
+    ], [
+      validated("A", 2, "kickoff"),
+      validated("A", 4, "kickoff", { eventDate: new Date("2026-08-14T00:00:00.000Z") }),
+      validated("A", 2, "second", { eventDate: new Date("2026-08-15T00:00:00.000Z") }),
+      validated("B", 4, "final", { eventDate: end }),
+    ], start, end);
+
+    expect(result).toMatchObject({
+      rosterSize: 3,
+      totalHours: 12,
+      participationRate: 66.67,
+      averageHours: 4,
+      medianHours: 4,
+      activeVolunteers: 2,
+      zeroHourVolunteers: 1,
+      completedOpportunities: 3,
+      minimumHours: 0,
+      maximumHours: 8,
+    });
+    expect(result.periods[0].periodHours).toBe(6);
+    expect(result.periods[1].periodHours).toBe(2);
+    expect(result.periods.at(-1)?.cumulativeHours).toBe(12);
+  });
+
+  it("uses the middle pair to calculate an even-roster median", () => {
+    const result = buildTeamMetrics(roster(["A", null], ["B", null], ["C", null], ["D", null]), [
+      validated("A", 1, "a"),
+      validated("B", 3, "b"),
+      validated("C", 7, "c"),
+      validated("D", 11, "d"),
+    ], start, end);
+
+    expect(result.medianHours).toBe(5);
+  });
+
+  it("uses the lowest active total for the minimum when every roster member is active", () => {
+    const result = buildTeamMetrics(roster(["A", null], ["B", null]), [
+      validated("A", 2, "a"),
+      validated("B", 5, "b"),
+    ], start, end);
+
+    expect(result.minimumHours).toBe(2);
+  });
+
+  it("emits zero-filled periods when no activity occurs in a gap", () => {
+    const result = buildTeamMetrics(roster(["A", null]), [
+      validated("A", 5, "later", { eventDate: new Date("2026-09-12T00:00:00.000Z") }),
+    ], start, end);
+
+    expect(result.periods.slice(0, 3).map((period) => period.periodHours)).toEqual([0, 0, 0]);
+    expect(result.periods[3]).toMatchObject({ startDate: "2026-09-12", endDate: "2026-09-25", periodHours: 5, cumulativeHours: 5 });
+  });
+
+  it("shortens the final period at the school-year end", () => {
+    const shortEnd = new Date("2026-08-16T23:59:59.999Z");
+    const result = buildTeamMetrics(roster(["A", null]), [], start, shortEnd);
+
+    expect(result.periods).toEqual([
+      { startDate: "2026-08-01", endDate: "2026-08-14", periodHours: 0, cumulativeHours: 0 },
+      { startDate: "2026-08-15", endDate: "2026-08-16", periodHours: 0, cumulativeHours: 0 },
+    ]);
+  });
+
+  it("ignores invalid attendance and activity outside the school year", () => {
+    const result = buildTeamMetrics(roster(["A", null]), [
+      validated("A", 3, "valid"),
+      validated("A", 30, "unvalidated", { attendance: "Pending" }),
+      validated("A", 30, "before", { eventDate: new Date("2026-07-31T23:59:59.999Z") }),
+      validated("A", 30, "after", { eventDate: new Date("2027-08-01T00:00:00.000Z") }),
+    ], start, end);
+
+    expect(result.totalHours).toBe(3);
+    expect(result.completedOpportunities).toBe(1);
+  });
+
+  it("counts duplicate opportunity IDs once while retaining all validated hours", () => {
+    const result = buildTeamMetrics(roster(["A", null]), [
+      validated("A", 2, "same"),
+      validated("A", 3, "same", { eventDate: new Date("2026-08-02T00:00:00.000Z") }),
+    ], start, end);
+
+    expect(result).toMatchObject({ totalHours: 5, completedOpportunities: 1 });
+  });
+
+  it("uses normalized event name and timestamp when an opportunity ID is missing", () => {
+    const result = buildTeamMetrics(roster(["A", null]), [
+      validated("A", 2, null, { eventName: "  Food Drive ", eventDate: new Date("2026-08-03T00:00:00.000Z") }),
+      validated("A", 3, null, { eventName: "food drive", eventDate: new Date("2026-08-03T00:00:00.000Z") }),
+    ], start, end);
+
+    expect(result).toMatchObject({ totalHours: 5, completedOpportunities: 1 });
+  });
+
+  it("refuses ambiguous name-only matches", () => {
+    const result = buildTeamMetrics(roster(["Jordan", null]), [
+      validated("Jordan", 4, "one", { email: "one@example.com" }),
+      validated("Jordan", 8, "two", { email: "two@example.com" }),
+    ], start, end);
+
+    expect(result).toMatchObject({ totalHours: 0, activeVolunteers: 0, completedOpportunities: 0 });
+  });
+
+  it("matches email before a conflicting name", () => {
+    const result = buildTeamMetrics(roster(["Roster Name", "jordan@example.com"]), [
+      validated("Report Name", 7.25, "email-match", { email: "JORDAN@example.com" }),
+    ], start, end);
+
+    expect(result).toMatchObject({ totalHours: 7.25, activeVolunteers: 1, completedOpportunities: 1 });
+  });
+});

