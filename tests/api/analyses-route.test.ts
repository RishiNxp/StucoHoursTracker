import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
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
});
