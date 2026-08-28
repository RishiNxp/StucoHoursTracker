import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const file = async (name) => new File([await readFile(join(directory, name))], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
const expected = {
  rosterSize: 3,
  totalHours: 9,
  participationRate: 66.67,
  averageHours: 3,
  medianHours: 4,
  activeVolunteers: 2,
  zeroHourVolunteers: 1,
  completedOpportunities: 3,
  minimumHours: 0,
  maximumHours: 5,
  periods: [
    { startDate: "2026-08-01", endDate: "2026-08-14", periodHours: 2, cumulativeHours: 2 },
    { startDate: "2026-08-15", endDate: "2026-08-28", periodHours: 4, cumulativeHours: 6 },
    { startDate: "2026-08-29", endDate: "2026-09-11", periodHours: 0, cumulativeHours: 6 },
    { startDate: "2026-09-12", endDate: "2026-09-25", periodHours: 3, cumulativeHours: 9 },
  ],
};

const form = new FormData();
form.set("teamReport", await file("team-metrics-browser-team-report.xlsx"));
form.set("upcomingReport", await file("team-metrics-browser-upcoming-report.xlsx"));
form.set("rosterReport", await file("team-metrics-browser-roster.xlsx"));
form.set("schoolYearStart", "2026-08-01");
form.set("schoolYearEnd", "2026-09-25");
form.set("capHours", "25");
form.set("save", "true");

const response = await fetch("http://localhost:3000/api/analyses", { method: "POST", body: form });
const created = await response.json();
assert.equal(response.status, 201, JSON.stringify(created));
assert.equal(created.ok, true, JSON.stringify(created));
assert.deepEqual(created.analysis.teamMetrics, expected);

const analysisId = created.analysis.id;
const listResponse = await fetch("http://localhost:3000/api/analyses");
const list = await listResponse.json();
assert.equal(listResponse.status, 200, JSON.stringify(list));
assert.equal(list.ok, true, JSON.stringify(list));
assert.ok(list.analyses.some((analysis) => analysis.id === analysisId), JSON.stringify(list));

const detail = async () => {
  const response = await fetch(`http://localhost:3000/api/analyses/${encodeURIComponent(analysisId)}`);
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.ok, true, JSON.stringify(body));
  assert.deepEqual(body.analysis.teamMetrics, expected);
  return body.analysis.teamMetrics;
};

const firstRead = await detail();
const refreshedRead = await detail();
assert.deepEqual(refreshedRead, firstRead);

console.log(JSON.stringify({
  createdStatus: response.status,
  analysisId,
  metrics: created.analysis.teamMetrics,
  listCount: list.analyses.length,
  detailStatus: 200,
  refreshMatchesSavedSnapshot: true,
}, null, 2));
