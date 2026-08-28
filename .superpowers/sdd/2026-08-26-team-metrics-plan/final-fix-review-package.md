# Team Metrics final fix current package

Original pre-fix state is in final-review-package.md. This package shows current task-scope state/diffs after the one final fix wave.

warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'app/analysis.css', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/ADMIN_GUIDE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/rendered-html.test.mjs', LF will be replaced by CRLF the next time Git touches it
diff --git a/README.md b/README.md
index a2f4dfd..7efad2c 100644
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
+The chart is anchored at the configured school-year start and divides the year into consecutive 14-calendar-day periods, with a shortened final period when needed. It retains zero-hour periods and shows both **Period Hours** and **Cumulative Hours**. Expand **View period data** to read every period's full date range and exact values with a keyboard or touch input.
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
 
diff --git a/app/analysis.css b/app/analysis.css
index c6f5a7c..6da54dc 100644
--- a/app/analysis.css
+++ b/app/analysis.css
@@ -19,4 +19,8 @@
 .submit-status { min-height:24px; text-align:center; color:#829093; font-size:9px; }
 .primary-button:disabled { opacity:.48; cursor:not-allowed; }
 .upload-modal { max-height:calc(100vh - 30px); overflow:auto; }
+.save-choice { display:flex; align-items:center; gap:8px; color:#48656b; font-size:11px; font-weight:700; margin:8px 0 10px; }.save-choice input { accent-color:var(--teal); }.history-list { display:grid; gap:10px; max-width:900px; }.history-item { width:100%; display:flex; justify-content:space-between; align-items:center; text-align:left; padding:18px 20px; border:1px solid #e7e8e3; border-radius:9px; background:#fff; color:var(--ink); }.history-item:hover { border-color:#e7a497; background:#fffaf8; }.history-item strong,.history-item span { display:block; }.history-item strong { font-size:14px; }.history-item span { color:#909c9d; font-size:10px; margin-top:5px; }.history-stats { display:flex; align-items:center; gap:16px; }.history-stats b { color:var(--coral); font-size:11px; }.detail-view { max-width:1100px; }.back-link { border:0; background:transparent; padding:0; margin-bottom:28px; color:var(--coral); font-size:11px; font-weight:700; }.saved-event-list { padding:5px 18px; }.saved-event { display:flex; justify-content:space-between; gap:16px; align-items:center; padding:15px 0; border-bottom:1px solid #f0efec; }.saved-event:last-child { border-bottom:0; }.saved-event strong,.saved-event span { display:block; }.saved-event strong { font-size:12px; color:#2f4659; }.saved-event>div>span { color:#94a0a1; font-size:10px; margin-top:4px; }
 @media (max-width:720px) { .analysis-config { grid-template-columns:1fr; } .analysis-banner { align-items:flex-start; gap:14px; flex-direction:column; } }
+
+.team-metrics-module { margin-top:38px; }.team-metrics-module>.section-heading p { color:#52636a; }.team-metrics-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; }.team-metric-card { min-height:116px; padding:17px 18px; border:1px solid #e7e8e3; border-radius:8px; background:#fff; }.team-metric-card:nth-child(1),.team-metric-card:nth-child(5) { border-top:3px solid var(--coral); padding-top:15px; }.team-metric-card:nth-child(2),.team-metric-card:nth-child(6) { border-top:3px solid var(--teal); padding-top:15px; }.team-metric-card span,.team-metric-card small { display:block; }.team-metric-card span { color:#52636a; font-size:10px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; }.team-metric-card strong { display:block; margin-top:9px; color:#213a51; font-size:26px; letter-spacing:-.05em; line-height:1; }.team-metric-card small { margin-top:8px; color:#52636a; font-size:10px; }.team-chart-card { margin-top:14px; padding:18px; border:1px solid #e7e8e3; border-radius:8px; background:#fff; overflow:hidden; }.team-chart-heading { display:flex; justify-content:space-between; gap:18px; align-items:flex-start; }.team-chart-heading h3 { margin:0; color:#263c51; font-size:14px; }.team-chart-heading p { margin:5px 0 0; color:#52636a; font-size:11px; }.team-chart-legend { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:12px; color:#637276; font-size:10px; font-weight:700; }.team-chart-legend span { display:flex; align-items:center; white-space:nowrap; }.team-chart-legend i { width:18px; height:3px; border-radius:3px; margin-right:6px; background:var(--coral); }.team-chart-legend .cumulative-series i { background:var(--teal); }.team-metrics-chart { display:block; width:100%; height:auto; margin-top:14px; overflow:visible; }.team-chart-gridline line { stroke:#ecebe6; stroke-width:1; }.team-chart-gridline text,.team-chart-x-label { fill:#52636a; font-size:10px; }.team-chart-axis { stroke:#52636a; stroke-width:1; }.team-chart-axis-label { fill:#52636a; font-size:11px; font-weight:700; }.team-chart-line { fill:none; stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }.period-line { stroke:var(--coral); }.cumulative-line { stroke:var(--teal); }.team-chart-point { stroke:#fff; stroke-width:2; }.period-point { fill:var(--coral); }.cumulative-point { fill:var(--teal); }.team-chart-data { margin-top:14px; border-top:1px solid #e7e8e3; }.team-chart-data summary { min-height:44px; display:flex; align-items:center; width:max-content; color:#52636a; font-size:11px; font-weight:700; cursor:pointer; }.team-period-table-scroll { overflow-x:auto; }.team-chart-data table { min-width:520px; }.team-chart-data th { color:#52636a; font-size:10px; }.team-chart-data td { color:#52616b; font-size:11px; }
+@media (max-width:720px) { .team-metrics-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }.team-metric-card { min-height:108px; padding:15px; }.team-metric-card:nth-child(1),.team-metric-card:nth-child(2),.team-metric-card:nth-child(5),.team-metric-card:nth-child(6) { padding-top:13px; }.team-metric-card strong { font-size:23px; }.team-chart-heading { flex-direction:column; }.team-chart-legend { justify-content:flex-start; }.team-chart-x-labels text:not(:first-child):not(:last-child):nth-child(odd) { display:none; } }
diff --git a/docs/ADMIN_GUIDE.md b/docs/ADMIN_GUIDE.md
index 22c8163..2c500c3 100644
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
+The chart begins at the configured school-year start and uses consecutive 14-calendar-day periods, with a shorter final period if necessary. Every period remains visible, including zero-hour periods. The coral series is **Period Hours** and the teal series is **Cumulative Hours**. Expand **View period data** to read every period's full date range and exact values with a keyboard or touch input.
+
+If you do not choose to save, a successful result is labeled **Current unsaved analysis** and can be lost on refresh. Copy any needed drafts before leaving the page. Missing volunteer email addresses remain visible as warnings and prevent draft creation for those registrations.
+
+When local D1/R2 bindings are available, select **Save this analysis to History** before analyzing. For a fresh local checkout, follow the D1 initialization commands in the project README first. Saved records contain the original workbooks in private R2 storage and an immutable result snapshot in D1. Team Metrics in History shows that saved snapshot exactly; it is never recalculated under newer rules. Version 1 and 2 History records still open without Team Metrics. Production requests require Sites/ChatGPT identity and active organization membership; never enable the `STUCO_DEV_AUTH` demo bypass outside local development.
 
 Opportunity names containing `MANDATORY` are retained automatically and labeled `Mandatory · exempt`. Their hours still count toward the projection. A total of exactly 25 hours is allowed; only a total above 25 triggers review.
 
diff --git a/tests/rendered-html.test.mjs b/tests/rendered-html.test.mjs
index 2f34e7c..0825eb4 100644
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
+  assert.match(teamMetrics, /Period Hours/);
+  assert.match(teamMetrics, /Cumulative Hours/);
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

