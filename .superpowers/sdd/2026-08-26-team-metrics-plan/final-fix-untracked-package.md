# Team Metrics final fix untracked-file package

Current full contents as no-index diffs.

warning: in the working copy of 'src/analysis/team-metrics.ts', LF will be replaced by CRLF the next time Git touches it
diff --git a/src/analysis/team-metrics.ts b/src/analysis/team-metrics.ts
new file mode 100644
index 0000000..d8e2b00
--- /dev/null
+++ b/src/analysis/team-metrics.ts
@@ -0,0 +1,86 @@
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
+  const matchedRows = rowsByStudent.flat().sort((left, right) => left.eventDate.getTime() - right.eventDate.getTime());
+  const hoursByStudent = rowsByStudent.map((rows) => rows.reduce((sum, row) => sum + row.hours, 0));
+  const exactTotalHours = matchedRows.reduce((sum, row) => sum + row.hours, 0);
+  const totalHours = roundHundredths(exactTotalHours);
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
+    averageHours: roundHundredths(roster.length ? exactTotalHours / roster.length : 0),
+    medianHours,
+    activeVolunteers,
+    zeroHourVolunteers: roster.length - activeVolunteers,
+    completedOpportunities: new Set(matchedRows.map(opportunityKey)).size,
+    minimumHours: roundHundredths(hoursByStudent.length ? Math.min(...hoursByStudent) : 0),
+    maximumHours: roundHundredths(Math.max(0, ...hoursByStudent)),
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
+    const periodRows = rows.filter((row) => row.eventDate >= cursor && row.eventDate < exclusiveEnd);
+    const exactPeriodHours = periodRows.reduce((sum, row) => sum + row.hours, 0);
+    cumulativeHours = periodRows.reduce((sum, row) => sum + row.hours, cumulativeHours);
+    periods.push({
+      startDate: dateLabel(cursor),
+      endDate: dateLabel(new Date(exclusiveEnd.getTime() - 1)),
+      periodHours: roundHundredths(exactPeriodHours),
+      cumulativeHours: roundHundredths(cumulativeHours),
+    });
+    cursor = exclusiveEnd;
+  }
+  return periods;
+}

warning: in the working copy of 'tests/analysis/team-metrics.test.ts', LF will be replaced by CRLF the next time Git touches it
diff --git a/tests/analysis/team-metrics.test.ts b/tests/analysis/team-metrics.test.ts
new file mode 100644
index 0000000..152096b
--- /dev/null
+++ b/tests/analysis/team-metrics.test.ts
@@ -0,0 +1,156 @@
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
+  it("rounds the combined total after aggregating fractional hours across students", () => {
+    const result = buildTeamMetrics(roster(["A", null], ["B", null]), [
+      validated("A", 1.005, "a"),
+      validated("B", 1.005, "b"),
+    ], start, end);
+
+    expect(result.totalHours).toBe(2.01);
+    expect(result.periods[0].periodHours).toBe(2.01);
+    expect(result.periods.at(-1)?.cumulativeHours).toBe(result.totalHours);
+  });
+
+  it("carries exact fractional hours across periods before rounding cumulative values", () => {
+    const result = buildTeamMetrics(roster(["A", null]), [
+      validated("A", 1.005, "first"),
+      validated("A", 1.005, "second", { eventDate: new Date("2026-08-15T00:00:00.000Z") }),
+    ], start, end);
+
+    expect(result.periods.slice(0, 2).map((period) => period.periodHours)).toEqual([1.01, 1.01]);
+    expect(result.totalHours).toBe(2.01);
+    expect(result.periods[1].cumulativeHours).toBe(result.totalHours);
+    expect(result.periods.at(-1)?.cumulativeHours).toBe(result.totalHours);
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

warning: in the working copy of 'app/components/TeamMetricsModule.tsx', LF will be replaced by CRLF the next time Git touches it
diff --git a/app/components/TeamMetricsModule.tsx b/app/components/TeamMetricsModule.tsx
new file mode 100644
index 0000000..c72d3c6
--- /dev/null
+++ b/app/components/TeamMetricsModule.tsx
@@ -0,0 +1,55 @@
+"use client";
+import type { TeamMetricsResult } from "../../src/analysis/types";
+
+const number = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
+const dateLabel = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
+const fullDateLabel = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
+
+export function TeamMetricsModule({ teamMetrics }: { teamMetrics: TeamMetricsResult }) {
+  const metrics = [
+    { label: "Total hours", value: number(teamMetrics.totalHours), note: "validated in this school year" },
+    { label: "Participation", value: `${number(teamMetrics.participationRate)}%`, note: "roster members with hours" },
+    { label: "Average hours", value: number(teamMetrics.averageHours), note: "per roster member" },
+    { label: "Median hours", value: number(teamMetrics.medianHours), note: "middle roster value" },
+    { label: "Active volunteers", value: number(teamMetrics.activeVolunteers), note: `of ${number(teamMetrics.rosterSize)} rostered` },
+    { label: "Zero-hour volunteers", value: number(teamMetrics.zeroHourVolunteers), note: "may need outreach" },
+    { label: "Completed opportunities", value: number(teamMetrics.completedOpportunities), note: "distinct validated events" },
+    { label: "Hours spread", value: `${number(teamMetrics.minimumHours)}–${number(teamMetrics.maximumHours)}`, note: "minimum to maximum" },
+  ];
+  const periods = teamMetrics.periods;
+  const maxValue = Math.max(1, ...periods.flatMap((period) => [period.periodHours, period.cumulativeHours]));
+  const width = 720, height = 272, left = 52, right = 20, top = 25, bottom = 52;
+  const chartWidth = width - left - right, chartHeight = height - top - bottom;
+  const x = (index: number) => left + (chartWidth * index) / Math.max(periods.length - 1, 1);
+  const y = (value: number) => top + chartHeight - (value / maxValue) * chartHeight;
+  const points = (key: "periodHours" | "cumulativeHours") => periods.map((period, index) => `${x(index)},${y(period[key])}`).join(" ");
+  const yTicks = [0, maxValue / 2, maxValue];
+
+  return <section className="team-metrics-module" aria-labelledby="team-metrics-heading">
+    <div className="section-heading"><div><h2 id="team-metrics-heading">Team metrics</h2><p>Roster-backed validated activity within this school year.</p></div></div>
+    <div className="team-metrics-grid">{metrics.map((metric) => <div className="team-metric-card" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></div>)}</div>
+    <div className="team-chart-card">
+      <div className="team-chart-heading"><div><h3>Hours over time</h3><p>Biweekly periods remain visible even when no hours were reported.</p></div><div className="team-chart-legend" aria-label="Chart legend"><span className="period-series"><i />Period Hours</span><span className="cumulative-series"><i />Cumulative Hours</span></div></div>
+      <svg className="team-metrics-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="team-metrics-chart-title team-metrics-chart-description">
+        <title id="team-metrics-chart-title">Team volunteer hours by biweekly period</title>
+        <desc id="team-metrics-chart-description">Coral points show Period Hours. Teal points show Cumulative Hours. The chart scale reaches {number(maxValue)} hours. Exact values for every period follow in the period data table.</desc>
+        {yTicks.map((tick) => <g className="team-chart-gridline" key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} /><text x={left - 9} y={y(tick) + 4} textAnchor="end">{number(tick)}</text></g>)}
+        <line className="team-chart-axis" x1={left} x2={width - right} y1={top + chartHeight} y2={top + chartHeight} />
+        <text className="team-chart-axis-label" x="16" y={top + chartHeight / 2} textAnchor="middle" transform={`rotate(-90 16 ${top + chartHeight / 2})`}>Hours</text>
+        <text className="team-chart-axis-label" x={left + chartWidth / 2} y={height - 7} textAnchor="middle">Biweekly period</text>
+        {periods.length > 0 && <><polyline className="team-chart-line period-line" points={points("periodHours")} /><polyline className="team-chart-line cumulative-line" points={points("cumulativeHours")} /></>}
+        <g className="team-chart-x-labels">{periods.map((period, index) => <text className="team-chart-x-label" key={period.startDate} x={x(index)} y={top + chartHeight + 18} textAnchor="middle">{dateLabel(period.startDate)}</text>)}</g>
+        {periods.map((period, index) => <g key={`${period.startDate}-points`}><circle className="team-chart-point period-point" cx={x(index)} cy={y(period.periodHours)} r="4"><title>{`${dateLabel(period.startDate)}–${dateLabel(period.endDate)}: ${number(period.periodHours)} Period Hours`}</title></circle><circle className="team-chart-point cumulative-point" cx={x(index)} cy={y(period.cumulativeHours)} r="4"><title>{`${dateLabel(period.startDate)}–${dateLabel(period.endDate)}: ${number(period.cumulativeHours)} Cumulative Hours`}</title></circle></g>)}
+      </svg>
+      <details className="team-chart-data">
+        <summary>View period data</summary>
+        <div className="team-period-table-scroll">
+          <table>
+            <thead><tr><th scope="col">Period</th><th scope="col">Period Hours</th><th scope="col">Cumulative Hours</th></tr></thead>
+            <tbody>{periods.map((period) => <tr key={`${period.startDate}-data`}><td>{`${fullDateLabel(period.startDate)}–${fullDateLabel(period.endDate)}`}</td><td>{number(period.periodHours)} hours</td><td>{number(period.cumulativeHours)} hours</td></tr>)}</tbody>
+          </table>
+        </div>
+      </details>
+    </div>
+  </section>;
+}

