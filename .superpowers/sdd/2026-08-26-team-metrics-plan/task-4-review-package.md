# Task 4 review package

Base: working tree before Task 4 (commits unavailable)
Head: current working tree
Note: tracked files include earlier approved feature hunks; review TeamMetrics UI changes.

warning: in the working copy of 'app/analysis.css', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'app/components/AnalysisDashboard.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/rendered-html.test.mjs', LF will be replaced by CRLF the next time Git touches it
diff --git a/app/analysis.css b/app/analysis.css
index c6f5a7c..1f5d437 100644
--- a/app/analysis.css
+++ b/app/analysis.css
@@ -19,4 +19,8 @@
 .submit-status { min-height:24px; text-align:center; color:#829093; font-size:9px; }
 .primary-button:disabled { opacity:.48; cursor:not-allowed; }
 .upload-modal { max-height:calc(100vh - 30px); overflow:auto; }
+.save-choice { display:flex; align-items:center; gap:8px; color:#48656b; font-size:11px; font-weight:700; margin:8px 0 10px; }.save-choice input { accent-color:var(--teal); }.history-list { display:grid; gap:10px; max-width:900px; }.history-item { width:100%; display:flex; justify-content:space-between; align-items:center; text-align:left; padding:18px 20px; border:1px solid #e7e8e3; border-radius:9px; background:#fff; color:var(--ink); }.history-item:hover { border-color:#e7a497; background:#fffaf8; }.history-item strong,.history-item span { display:block; }.history-item strong { font-size:14px; }.history-item span { color:#909c9d; font-size:10px; margin-top:5px; }.history-stats { display:flex; align-items:center; gap:16px; }.history-stats b { color:var(--coral); font-size:11px; }.detail-view { max-width:1100px; }.back-link { border:0; background:transparent; padding:0; margin-bottom:28px; color:var(--coral); font-size:11px; font-weight:700; }.saved-event-list { padding:5px 18px; }.saved-event { display:flex; justify-content:space-between; gap:16px; align-items:center; padding:15px 0; border-bottom:1px solid #f0efec; }.saved-event:last-child { border-bottom:0; }.saved-event strong,.saved-event span { display:block; }.saved-event strong { font-size:12px; color:#2f4659; }.saved-event>div>span { color:#94a0a1; font-size:10px; margin-top:4px; }
 @media (max-width:720px) { .analysis-config { grid-template-columns:1fr; } .analysis-banner { align-items:flex-start; gap:14px; flex-direction:column; } }
+
+.team-metrics-module { margin-top:38px; }.team-metrics-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; }.team-metric-card { min-height:116px; padding:17px 18px; border:1px solid #e7e8e3; border-radius:8px; background:#fff; }.team-metric-card:nth-child(1),.team-metric-card:nth-child(5) { border-top:3px solid var(--coral); padding-top:15px; }.team-metric-card:nth-child(2),.team-metric-card:nth-child(6) { border-top:3px solid var(--teal); padding-top:15px; }.team-metric-card span,.team-metric-card small { display:block; }.team-metric-card span { color:#899296; font-size:9px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; }.team-metric-card strong { display:block; margin-top:9px; color:#213a51; font-size:26px; letter-spacing:-.05em; line-height:1; }.team-metric-card small { margin-top:8px; color:#9ba4a4; font-size:9px; }.team-chart-card { margin-top:14px; padding:18px; border:1px solid #e7e8e3; border-radius:8px; background:#fff; overflow:hidden; }.team-chart-heading { display:flex; justify-content:space-between; gap:18px; align-items:flex-start; }.team-chart-heading h3 { margin:0; color:#263c51; font-size:14px; }.team-chart-heading p { margin:5px 0 0; color:#939c9e; font-size:10px; }.team-chart-legend { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:12px; color:#637276; font-size:10px; font-weight:700; }.team-chart-legend span { display:flex; align-items:center; white-space:nowrap; }.team-chart-legend i { width:18px; height:3px; border-radius:3px; margin-right:6px; background:var(--coral); }.team-chart-legend .cumulative-series i { background:var(--teal); }.team-metrics-chart { display:block; width:100%; height:auto; margin-top:14px; overflow:visible; }.team-chart-gridline line { stroke:#ecebe6; stroke-width:1; }.team-chart-gridline text,.team-chart-x-label { fill:#98a1a1; font-size:9px; }.team-chart-axis { stroke:#d5d8d4; stroke-width:1; }.team-chart-axis-label { fill:#77878b; font-size:10px; font-weight:700; }.team-chart-line { fill:none; stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }.period-line { stroke:var(--coral); }.cumulative-line { stroke:var(--teal); }.team-chart-point { stroke:#fff; stroke-width:2; }.period-point { fill:var(--coral); }.cumulative-point { fill:var(--teal); }
+@media (max-width:720px) { .team-metrics-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }.team-metric-card { min-height:108px; padding:15px; }.team-metric-card:nth-child(1),.team-metric-card:nth-child(2),.team-metric-card:nth-child(5),.team-metric-card:nth-child(6) { padding-top:13px; }.team-metric-card strong { font-size:23px; }.team-chart-heading { flex-direction:column; }.team-chart-legend { justify-content:flex-start; }.team-chart-x-labels text:not(:first-child):not(:last-child):nth-child(odd) { display:none; } }
diff --git a/app/components/AnalysisDashboard.tsx b/app/components/AnalysisDashboard.tsx
index 9221289..281d43d 100644
--- a/app/components/AnalysisDashboard.tsx
+++ b/app/components/AnalysisDashboard.tsx
@@ -1,6 +1,8 @@
 "use client";
 import { useMemo, useState } from "react";
 import type { AnalysisEvent, AnalysisViewModel, AnalysisVolunteer } from "../analysis-types";
+import { PerformanceModule } from "./PerformanceModule";
+import { TeamMetricsModule } from "./TeamMetricsModule";
 type Props = { analysis: AnalysisViewModel | null; onNewAnalysis(): void }; type Row = { volunteer: AnalysisVolunteer; event: AnalysisEvent };
 const label = { allowed: "Allowed", flagged: "Review / remove", mandatory_exempt: "Mandatory · exempt" } as const;
 const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
@@ -10,9 +12,12 @@ export function AnalysisDashboard({ analysis, onNewAnalysis }: Props) {
   const rows = useMemo<Row[]>(() => analysis?.volunteers.flatMap((volunteer) => volunteer.events.map((event) => ({ volunteer, event }))) ?? [], [analysis]); const visible = filter === "all" ? rows : rows.filter(({ event }) => event.classification === filter);
   async function copy(row: Row) { if (!row.event.draft) return; await navigator.clipboard.writeText(row.event.draft.copyText); setCopied(`${row.volunteer.volunteerKey}-${row.event.eventName}`); window.setTimeout(() => setCopied(null), 1800); }
   if (!analysis) return <div className="welcome-state"><div className="welcome-mark">＋</div><p className="eyebrow">NEW ANALYSIS</p><h1>Keep opportunities <em>fair.</em></h1><p>Upload the latest Helper Helper reports to replace demonstration data with a real, private calculation.</p><button className="primary-button" onClick={onNewAnalysis}>Choose reports</button><div className="privacy-strip">Processed in memory · Nothing saved to History · No emails sent automatically</div></div>;
-  return <><div className="analysis-banner"><div><strong>Current unsaved analysis</strong><span>{analysis.configuration.schoolYearLabel} · {analysis.configuration.capHours}-hour cap</span></div><button className="primary-button" onClick={onNewAnalysis}>＋ New analysis</button></div>
+  const saved = Boolean(analysis.id);
+  return <><div className="analysis-banner"><div><strong>{saved ? "Saved analysis" : "Current unsaved analysis"}</strong><span>{analysis.configuration.schoolYearLabel} · {analysis.configuration.capHours}-hour cap</span></div><button className="primary-button" onClick={onNewAnalysis}>＋ New analysis</button></div>
     <div className="stat-grid analysis-stats"><div className="stat-card accent-coral"><div className="stat-label">Needs review</div><div className="stat-value">{analysis.summary.flaggedOptionalEvents}</div><div className="stat-foot">optional events flagged</div></div><div className="stat-card"><div className="stat-label">Volunteers</div><div className="stat-value">{analysis.summary.volunteers}</div><div className="stat-foot">in this analysis</div></div><div className="stat-card"><div className="stat-label">Mandatory retained</div><div className="stat-value">{analysis.summary.mandatoryExemptEvents}</div><div className="stat-foot">exempt registrations</div></div><div className="stat-card warm-card"><div className="stat-label">Data warnings</div><div className="stat-value">{analysis.summary.warnings}</div><div className="stat-foot">review before acting</div></div></div>
     <div className="section-heading"><div><h2>Upcoming opportunity check</h2><p>Projected totals after each active registration</p></div><select className="filter-button" aria-label="Filter statuses" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option><option value="flagged">Review / remove</option><option value="allowed">Allowed</option><option value="mandatory_exempt">Mandatory · exempt</option></select></div>
-    <div className="table-card"><div className="table-meta"><span>{rows.length} event registrations</span><span className="meta-divider" /><span>Not saved to History</span></div>{visible.length === 0 ? <div className="empty-results">No registrations match this view.</div> : <div className="table-scroll"><table><thead><tr><th>VOLUNTEER</th><th>CURRENT HOURS</th><th>UPCOMING EVENT</th><th>DATE</th><th>PROJECTED</th><th>STATUS</th><th /></tr></thead><tbody>{visible.map((row) => { const key = `${row.volunteer.volunteerKey}-${row.event.eventName}`; return <tr key={`${key}-${row.event.eventDate}`}><td><div className="person-cell"><div className={`person-avatar ${row.event.classification === "mandatory_exempt" ? "teal" : ""}`}>{initials(row.volunteer.name)}</div><div><strong>{row.volunteer.name}</strong><span>{row.volunteer.email ?? "Email missing"}</span></div></div></td><td><strong className="hours-current">{formatHours(row.volunteer.currentValidatedHours)}</strong><span className="hours-unit"> hrs</span></td><td><span className={`event-name ${row.event.classification === "mandatory_exempt" ? "mandatory-name" : ""}`}>{row.event.eventName}</span><span className="duration">{formatHours(row.event.durationHours)} hours{row.event.warning ? ` · ⚠ ${row.event.warning}` : ""}</span></td><td className="date-cell">{new Date(row.event.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</td><td><strong className={row.event.classification === "flagged" ? "projected-hot" : "projected-ok"}>{formatHours(row.event.projectedHours)}</strong><span className="hours-unit"> hrs</span></td><td><span className={`status-pill ${row.event.classification === "flagged" ? "review" : row.event.classification === "allowed" ? "allowed" : "exempt"}`}><i />{label[row.event.classification]}</span></td><td>{row.event.draft && <button className="copy-button" onClick={() => copy(row)}>{copied === key ? "Copied" : "Copy email"}</button>}</td></tr>; })}</tbody></table></div>}<div className="table-bottom"><span><b>{analysis.summary.flaggedOptionalEvents}</b> optional events need review</span><span><b>{analysis.summary.mandatoryExemptEvents}</b> mandatory events retained</span></div></div>
+    <div className="table-card"><div className="table-meta"><span>{rows.length} event registrations</span><span className="meta-divider" /><span>{saved ? "Saved to History" : "Not saved to History"}</span></div>{visible.length === 0 ? <div className="empty-results">No registrations match this view.</div> : <div className="table-scroll"><table><thead><tr><th>VOLUNTEER</th><th>CURRENT HOURS</th><th>UPCOMING EVENT</th><th>DATE</th><th>PROJECTED</th><th>STATUS</th><th /></tr></thead><tbody>{visible.map((row) => { const key = `${row.volunteer.volunteerKey}-${row.event.eventName}`; return <tr key={`${key}-${row.event.eventDate}`}><td><div className="person-cell"><div className={`person-avatar ${row.event.classification === "mandatory_exempt" ? "teal" : ""}`}>{initials(row.volunteer.name)}</div><div><strong>{row.volunteer.name}</strong><span>{row.volunteer.email ?? "Email missing"}</span></div></div></td><td><strong className="hours-current">{formatHours(row.volunteer.currentValidatedHours)}</strong><span className="hours-unit"> hrs</span></td><td><span className={`event-name ${row.event.classification === "mandatory_exempt" ? "mandatory-name" : ""}`}>{row.event.eventName}</span><span className="duration">{formatHours(row.event.durationHours)} hours{row.event.warning ? ` · ⚠ ${row.event.warning}` : ""}</span></td><td className="date-cell">{new Date(row.event.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</td><td><strong className={row.event.classification === "flagged" ? "projected-hot" : "projected-ok"}>{formatHours(row.event.projectedHours)}</strong><span className="hours-unit"> hrs</span></td><td><span className={`status-pill ${row.event.classification === "flagged" ? "review" : row.event.classification === "allowed" ? "allowed" : "exempt"}`}><i />{label[row.event.classification]}</span></td><td>{row.event.draft && <button className="copy-button" onClick={() => copy(row)}>{copied === key ? "Copied" : "Copy email"}</button>}</td></tr>; })}</tbody></table></div>}<div className="table-bottom"><span><b>{analysis.summary.flaggedOptionalEvents}</b> optional events need review</span><span><b>{analysis.summary.mandatoryExemptEvents}</b> mandatory events retained</span></div></div>
+    {analysis.performance && <PerformanceModule performance={analysis.performance} />}
+    {analysis.teamMetrics && <TeamMetricsModule teamMetrics={analysis.teamMetrics} />}
   </>;
 }
diff --git a/tests/rendered-html.test.mjs b/tests/rendered-html.test.mjs
index 2f34e7c..91788bc 100644
--- a/tests/rendered-html.test.mjs
+++ b/tests/rendered-html.test.mjs
@@ -6,16 +6,53 @@ test("STUCO Hours Desk product surface is present", async () => {
   const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
   const modal = await readFile(new URL("../app/components/AnalysisUploadModal.tsx", import.meta.url), "utf8");
   const dashboard = await readFile(new URL("../app/components/AnalysisDashboard.tsx", import.meta.url), "utf8");
-  const surface = `${page}\n${modal}\n${dashboard}`;
+  const history = await readFile(new URL("../app/components/HistoryView.tsx", import.meta.url), "utf8");
+  const detail = await readFile(new URL("../app/components/AnalysisDetailView.tsx", import.meta.url), "utf8");
+  const performance = await readFile(new URL("../app/components/PerformanceModule.tsx", import.meta.url), "utf8");
+  const teamMetrics = await readFile(new URL("../app/components/TeamMetricsModule.tsx", import.meta.url), "utf8");
+  const surface = `${page}\n${modal}\n${dashboard}\n${history}\n${detail}\n${performance}\n${teamMetrics}`;
   assert.match(surface, /Keep opportunities/);
   assert.match(surface, /School-year start/);
   assert.match(surface, /School-year end/);
   assert.match(surface, /Hour cap/);
   assert.match(surface, /Analyzing reports/);
   assert.match(surface, /Current unsaved analysis/);
+  assert.match(surface, /Save this analysis to History/);
+  assert.match(surface, /No saved analyses yet/);
+  assert.match(surface, /IMMUTABLE ANALYSIS/);
   assert.match(surface, /Copy email/);
+  assert.match(surface, /Full Roster/);
+  assert.match(surface, /Top performers/);
+  assert.match(surface, /Steady performers/);
+  assert.match(surface, /Developing performers/);
+  assert.match(surface, /Validated hours/);
+  assert.match(surface, /Completed opportunities/);
+  assert.match(surface, /Combined score/);
+  assert.match(surface, /Team metrics/);
+  assert.match(surface, /Total hours/);
+  assert.match(surface, /Participation/);
+  assert.match(surface, /Average hours/);
+  assert.match(surface, /Median hours/);
+  assert.match(surface, /Active volunteers/);
+  assert.match(surface, /Zero-hour volunteers/);
+  assert.match(surface, /Completed opportunities/);
+  assert.match(surface, /Hours spread/);
+  assert.match(surface, /Hours this period/);
+  assert.match(surface, /Cumulative hours/);
   assert.match(surface, /maximumFractionDigits:\s*2/);
+  assert.match(page, /const navigate = \(tab/);
+  assert.match(page, /setDetailId\(null\)/);
+  assert.match(page, /onClick=\{\(\) => navigate\("Overview"\)\}/);
+  assert.match(page, /onClick=\{\(\) => navigate\("History"\)\}/);
+  assert.match(page, /onClick=\{\(\) => navigate\("Officers"\)\}/);
   assert.doesNotMatch(surface, /Send email/);
   assert.doesNotMatch(page, /Om Chandge|Keerthi Thota/);
   assert.doesNotMatch(page, /codex-preview/);
 });
+
+test("Cloudflare compatibility flags are declared only once", async () => {
+  const vite = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
+  const wrangler = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
+  const declarations = `${vite}\n${wrangler}`.match(/nodejs_compat/g) ?? [];
+  assert.equal(declarations.length, 1);
+});

warning: in the working copy of 'app/components/TeamMetricsModule.tsx', LF will be replaced by CRLF the next time Git touches it
diff --git a/app/components/TeamMetricsModule.tsx b/app/components/TeamMetricsModule.tsx
new file mode 100644
index 0000000..5bc870f
--- /dev/null
+++ b/app/components/TeamMetricsModule.tsx
@@ -0,0 +1,45 @@
+"use client";
+import type { TeamMetricsResult } from "../../src/analysis/types";
+
+const number = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
+const dateLabel = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
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
+      <div className="team-chart-heading"><div><h3>Hours over time</h3><p>Biweekly periods remain visible even when no hours were reported.</p></div><div className="team-chart-legend" aria-label="Chart legend"><span className="period-series"><i />Hours this period</span><span className="cumulative-series"><i />Cumulative hours</span></div></div>
+      <svg className="team-metrics-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="team-metrics-chart-title team-metrics-chart-description">
+        <title id="team-metrics-chart-title">Team volunteer hours by biweekly period</title>
+        <desc id="team-metrics-chart-description">Coral points show Hours this period. Teal points show Cumulative hours. The chart scale reaches {number(maxValue)} hours.</desc>
+        {yTicks.map((tick) => <g className="team-chart-gridline" key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} /><text x={left - 9} y={y(tick) + 4} textAnchor="end">{number(tick)}</text></g>)}
+        <line className="team-chart-axis" x1={left} x2={width - right} y1={top + chartHeight} y2={top + chartHeight} />
+        <text className="team-chart-axis-label" x="16" y={top + chartHeight / 2} textAnchor="middle" transform={`rotate(-90 16 ${top + chartHeight / 2})`}>Hours</text>
+        <text className="team-chart-axis-label" x={left + chartWidth / 2} y={height - 7} textAnchor="middle">Biweekly period</text>
+        {periods.length > 0 && <><polyline className="team-chart-line period-line" points={points("periodHours")} /><polyline className="team-chart-line cumulative-line" points={points("cumulativeHours")} /></>}
+        <g className="team-chart-x-labels">{periods.map((period, index) => <text className="team-chart-x-label" key={period.startDate} x={x(index)} y={top + chartHeight + 18} textAnchor="middle">{dateLabel(period.startDate)}</text>)}</g>
+        {periods.map((period, index) => <g key={`${period.startDate}-points`}><circle className="team-chart-point period-point" cx={x(index)} cy={y(period.periodHours)} r="4"><title>{`${dateLabel(period.startDate)}–${dateLabel(period.endDate)}: ${number(period.periodHours)} hours this period`}</title></circle><circle className="team-chart-point cumulative-point" cx={x(index)} cy={y(period.cumulativeHours)} r="4"><title>{`${dateLabel(period.startDate)}–${dateLabel(period.endDate)}: ${number(period.cumulativeHours)} cumulative hours`}</title></circle></g>)}
+      </svg>
+    </div>
+  </section>;
+}

