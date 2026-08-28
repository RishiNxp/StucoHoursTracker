# Task 5 review package

Base: working tree before Task 5 (commits unavailable)
Head: current working tree
Note: docs include earlier approved feature documentation; review Team Metrics definitions and scoped rendered assertion fix.

warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/ADMIN_GUIDE.md', LF will be replaced by CRLF the next time Git touches it
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

