import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("STUCO Hours Desk product surface is present", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const modal = await readFile(new URL("../app/components/AnalysisUploadModal.tsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../app/components/AnalysisDashboard.tsx", import.meta.url), "utf8");
  const surface = `${page}\n${modal}\n${dashboard}`;
  assert.match(surface, /Keep opportunities/);
  assert.match(surface, /School-year start/);
  assert.match(surface, /School-year end/);
  assert.match(surface, /Hour cap/);
  assert.match(surface, /Analyzing reports/);
  assert.match(surface, /Current unsaved analysis/);
  assert.match(surface, /Copy email/);
  assert.match(surface, /maximumFractionDigits:\s*2/);
  assert.doesNotMatch(surface, /Send email/);
  assert.doesNotMatch(page, /Om Chandge|Keerthi Thota/);
  assert.doesNotMatch(page, /codex-preview/);
});
