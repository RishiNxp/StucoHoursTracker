# Team Metrics final review package

Base: feature branch working tree before plan (commits unavailable)
Head: current working tree
Read ledger for rulings/deferred items. Some tracked diffs include earlier roster/history work; review Team Metrics plan scope.

warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'app/analysis-types.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'app/analysis.css', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'app/components/AnalysisDashboard.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/ADMIN_GUIDE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/analysis/service.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/analysis/types.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/analysis/service.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/api/analyses-route.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/rendered-html.test.mjs', LF will be replaced by CRLF the next time Git touches it
diff --git a/README.md b/README.md
index a2f4dfd..a2c5771 100644
--- a/README.md
+++ b/README.md
@@ -24,9 +24,42 @@ npm.cmd install
 npm.cmd run dev
 ```
 
-Open the local URL printed by Vinext. Choose **New analysis**, upload the Helper Helper Team Report and Upcoming Opportunities `.xlsx` exports, confirm the inclusive school-year dates and positive hour cap, and select **Analyze reports**. Each file must be 10 MiB or smaller.
+Open the local URL printed by Vinext. Choose **New analysis**, upload the Helper Helper Team Report and Upcoming Opportunities `.xlsx` exports, and optionally upload a Full Roster workbook. Confirm the inclusive school-year dates and positive hour cap, then select **Analyze reports**. Each file must be 10 MiB or smaller.
 
-The current analysis is held only in the browser session. Refreshing or navigating away may discard it; History and officer management are not yet persisted. Workbook bytes are processed in memory, no emails are sent automatically, and Helper Helper registrations are never changed.
+When a Full Roster is supplied, Overview includes every rostered student—even students with zero activity—and groups them as Top, Steady, or Developing performers from the actual score distribution. Ties remain together, so the groups are not forced to equal sizes. You can sort each group by combined score, validated hours, completed opportunities, or name.
+
+## Team Metrics
+
+Team Metrics requires a successfully uploaded **Full Roster** and appears directly below Roster Performance. It uses only Team Report activity marked `Validated` (case-insensitive) that falls within the configured inclusive school year, then matches it to roster members by email first or by an unambiguous normalized name. Ambiguous name-only activity is excluded.
+
+The eight cards mean:
+
+- **Total hours:** eligible matched validated hours.
+- **Participation:** percentage of roster members with more than zero validated hours.
+- **Average hours:** total hours divided by every roster member, including zero-hour members.
+- **Median hours:** the middle roster-member total, including zeros; for an even roster, it is the mean of the two middle totals.
+- **Active volunteers:** roster members with more than zero validated hours.
+- **Zero-hour volunteers:** roster members with exactly zero validated hours.
+- **Completed opportunities:** distinct eligible matched events, using the event name/date fallback when an event ID is missing.
+- **Hours spread:** the lowest through highest roster-member totals, including zeros.
+
+The chart is anchored at the configured school-year start and divides the year into consecutive 14-calendar-day periods, with a shortened final period when needed. It retains zero-hour periods and shows both **Hours this period** and **Cumulative hours**.
+
+An analysis is held in the browser session unless you select **Save this analysis to History**. Saved analyses are organization-scoped and retain an immutable result snapshot plus the source workbooks in private storage. Workbook bytes are processed in memory before saving, no emails are sent automatically, and Helper Helper registrations are never changed.
+
+Saved Team Metrics are part of that immutable snapshot: History displays the values that were calculated when the analysis was saved and does not recalculate them under later rules. Older History records that predate Team Metrics still open normally without the module.
+
+To save an analysis and use History locally, copy `.env.example` to `.env.local`, then initialize the local D1 schema and demo membership:
+
+```powershell
+Copy-Item .env.example .env.local
+.\node_modules\.bin\wrangler.cmd d1 execute DB --local --file drizzle/0000_puzzling_thundra.sql --yes
+.\node_modules\.bin\wrangler.cmd d1 execute DB --local --file drizzle/0001_thankful_sleepwalker.sql --yes
+.\node_modules\.bin\wrangler.cmd d1 execute DB --local --file drizzle/0002_roster_performance.sql --yes
+.\node_modules\.bin\wrangler.cmd d1 execute DB --local --command "INSERT OR IGNORE INTO organizations (id,name,created_at) VALUES ('local-stuco','Local STUCO',strftime('%s','now')*1000); INSERT OR IGNORE INTO memberships (id,organization_id,user_id,email,active,created_at) VALUES ('local-demo-membership','local-stuco','local-demo','demo@stuco.local',1,strftime('%s','now')*1000);" --yes
+```
+
+This fixed demo identity is for local testing only and must never be enabled in production. Production access requires Sites/ChatGPT identity headers plus an active membership in the organization configured by `STUCO_ORGANIZATION_ID`.
 
 Run `npm.cmd test`, `npm.cmd run lint`, and `npx.cmd tsc --noEmit` before publishing changes.
 
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
diff --git a/docs/ADMIN_GUIDE.md b/docs/ADMIN_GUIDE.md
index 22c8163..d25a719 100644
--- a/docs/ADMIN_GUIDE.md
+++ b/docs/ADMIN_GUIDE.md
@@ -12,14 +12,26 @@ Each officer signs in with their own ChatGPT account. Active officers can invite
 
 1. Export the Team Report from Helper Helper.
 2. Export Upcoming Opportunities with individual volunteer registrations.
-3. Start a new analysis and upload both files.
+3. Start a new analysis and upload both files. Optionally upload the Full Roster to include students with no recorded activity.
 4. Confirm school-year dates and the 25-hour limit.
 5. Review warnings before acting on any flag.
 6. Copy the draft for each optional event marked `Review / remove`.
 
 Both files must be `.xlsx` workbooks no larger than 10 MiB. The Team Report must contain `Commitments`; the upcoming export must contain `Opportunity Volunteers`. If the site reports a missing sheet, column, date, duration, duplicate, or malformed workbook, correct or re-export the source report and submit both files again.
 
-This milestone does not save analyses. A successful result is labeled **Current unsaved analysis** and can be lost on refresh. Copy any needed drafts before leaving the page. Missing volunteer email addresses remain visible as warnings and prevent draft creation for those registrations.
+With a Full Roster uploaded, the Overview shows Top, Steady, and Developing performers based on an equal-weight score from validated hours and distinct completed opportunities. Groups follow the actual score distribution and preserve ties; they are not equal-headcount buckets. If everyone has zero activity, everyone is Developing. If everyone has the same nonzero activity, everyone is Steady. Use the sort control to order students by combined score, hours, opportunities, or name.
+
+## Team Metrics
+
+Team Metrics is available only when the Full Roster upload succeeds. It is shown directly below Roster Performance and includes every rostered student, including zero-hour students. It counts only Team Report rows marked `Validated` (case-insensitive) with an event date inside the inclusive school year. The system matches by normalized email first, then by normalized name only when that name identifies one person; ambiguous name-only activity is excluded.
+
+The eight values are: **Total hours** (eligible matched validated hours); **Participation** (the percent of roster members with more than zero hours); **Average hours** (total divided by all roster members, including zero-hour members); **Median hours** (the middle total including zeros, or the mean of the two middle totals for an even roster); **Active volunteers** (more than zero hours); **Zero-hour volunteers** (exactly zero hours); **Completed opportunities** (distinct eligible matched events, with event name/date used when an ID is missing); and **Hours spread** (lowest to highest roster-member totals, including zeros).
+
+The chart begins at the configured school-year start and uses consecutive 14-calendar-day periods, with a shorter final period if necessary. Every period remains visible, including zero-hour periods. The coral series is **Hours this period** and the teal series is **Cumulative hours**.
+
+If you do not choose to save, a successful result is labeled **Current unsaved analysis** and can be lost on refresh. Copy any needed drafts before leaving the page. Missing volunteer email addresses remain visible as warnings and prevent draft creation for those registrations.
+
+When local D1/R2 bindings are available, select **Save this analysis to History** before analyzing. For a fresh local checkout, follow the D1 initialization commands in the project README first. Saved records contain the original workbooks in private R2 storage and an immutable result snapshot in D1. Team Metrics in History shows that saved snapshot exactly; it is never recalculated under newer rules. Version 1 and 2 History records still open without Team Metrics. Production requests require Sites/ChatGPT identity and active organization membership; never enable the `STUCO_DEV_AUTH` demo bypass outside local development.
 
 Opportunity names containing `MANDATORY` are retained automatically and labeled `Mandatory · exempt`. Their hours still count toward the projection. A total of exactly 25 hours is allowed; only a total above 25 triggers review.
 
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
diff --git a/src/analysis/types.ts b/src/analysis/types.ts
index c365afd..b781498 100644
--- a/src/analysis/types.ts
+++ b/src/analysis/types.ts
@@ -6,6 +6,33 @@ export type HistoryRow = { volunteerKey: string; name: string; email: string | n
 export type UpcomingRow = { volunteerKey: string; name: string; email: string | null; eventName: string; eventDate: Date; durationHours: number; status: string | null; team: string | null; warning?: string };
 export type NormalizedHistory = { rows: HistoryRow[]; issues: ValidationIssue[] };
 export type NormalizedUpcoming = { rows: UpcomingRow[]; issues: ValidationIssue[] };
+export type RosterStudent = { volunteerKey: string; name: string; email: string | null; warnings: string[] };
+export type NormalizedRoster = { rows: RosterStudent[]; issues: ValidationIssue[] };
+
+export type PerformanceGroup = "developing" | "steady" | "top";
+export type PerformanceStudent = RosterStudent & { validatedHours: number; completedOpportunities: number; combinedScore: number; group: PerformanceGroup };
+export type PerformanceResult = { students: PerformanceStudent[]; summary: Record<PerformanceGroup, number>; boundaries: { lower: number; upper: number } | null };
+export type PerformanceSortKey = "combinedScore" | "validatedHours" | "completedOpportunities" | "name";
+
+export type TeamMetricPeriod = {
+  startDate: string;
+  endDate: string;
+  periodHours: number;
+  cumulativeHours: number;
+};
+export type TeamMetricsResult = {
+  rosterSize: number;
+  totalHours: number;
+  participationRate: number;
+  averageHours: number;
+  medianHours: number;
+  activeVolunteers: number;
+  zeroHourVolunteers: number;
+  completedOpportunities: number;
+  minimumHours: number;
+  maximumHours: number;
+  periods: TeamMetricPeriod[];
+};
 
 export type EventClassification = "allowed" | "flagged" | "mandatory_exempt";
 export type ClassifiedEvent = UpcomingRow & { projectedHours: number; classification: EventClassification; warning?: string };
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
diff --git a/tests/rendered-html.test.mjs b/tests/rendered-html.test.mjs
index 2f34e7c..d108353 100644
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
-  assert.match(surface, /maximumFractionDigits:\s*2/);
+  assert.match(surface, /Full Roster/);
+  assert.match(surface, /Top performers/);
+  assert.match(surface, /Steady performers/);
+  assert.match(surface, /Developing performers/);
+  assert.match(surface, /Validated hours/);
+  assert.match(surface, /Completed opportunities/);
+  assert.match(surface, /Combined score/);
+  assert.match(teamMetrics, /Team metrics/);
+  assert.match(teamMetrics, /Total hours/);
+  assert.match(teamMetrics, /Participation/);
+  assert.match(teamMetrics, /Average hours/);
+  assert.match(teamMetrics, /Median hours/);
+  assert.match(teamMetrics, /Active volunteers/);
+  assert.match(teamMetrics, /Zero-hour volunteers/);
+  assert.match(teamMetrics, /Completed opportunities/);
+  assert.match(teamMetrics, /Hours spread/);
+  assert.match(teamMetrics, /Hours this period/);
+  assert.match(teamMetrics, /Cumulative hours/);
+  assert.match(teamMetrics, /maximumFractionDigits:\s*2/);
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

