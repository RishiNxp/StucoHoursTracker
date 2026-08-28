import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { analyzeReports } from "../../src/analysis/service";

const bytes = (sheets: Record<string, unknown[][]>) => {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
};
const team = () => bytes({ Commitments: [
  ["VOLUNTEER NAME", "DURATION (HRS)", "ATTENDANCE", "DATE AND TIME", "OPPORTUNITY", "VOLUNTEER EMAIL", "OPP ID"],
  ["Jordan", 24, "Validated", "2026-09-01", "Completed", "jordan@example.com", "1"],
] });
const upcoming = () => bytes({ "Opportunity Volunteers": [
  ["OPPORTUNITY", "DATE AND TIME", "DURATION", "EMAIL ADDRESS", "TEAMS", "STATUS"],
  ["Food Drive", "2026-09-12", 2, "jordan@example.com", "STUCO", "Active"],
] });
const roster = () => bytes({ Roster: [
  ["Student Name", "Email Address"],
  ["Jordan", "jordan@example.com"],
  ["No Activity", "none@example.com"],
] });

describe("analyzeReports", () => {
  it("returns JSON-safe real results and a configurable draft", () => {
    const result = analyzeReports({ teamReport: team(), upcomingReport: upcoming(), schoolYearStart: "2026-08-01", schoolYearEnd: "2027-07-31", capHours: 25 });
    expect(result.issues).toEqual([]);
    expect(result.summary.flaggedOptionalEvents).toBe(1);
    expect(result.volunteers[0].events[0].eventDate).toMatch(/^2026-09-12/);
    expect(result.volunteers[0].events[0].draft?.body).toContain("25-hour limit");
  });

  it("returns fatal workbook issues without a misleading result", () => {
    const result = analyzeReports({ teamReport: bytes({ Wrong: [["NOPE"]] }), upcomingReport: upcoming(), schoolYearStart: "2026-08-01", schoolYearEnd: "2027-07-31", capHours: 25 });
    expect(result.issues.map((issue) => issue.code)).toContain("MISSING_SHEET");
    expect(result.volunteers).toEqual([]);
  });

  it("suppresses drafts for missing-email registrations", () => {
    const report = bytes({ "Opportunity Volunteers": [
      ["OPPORTUNITY", "DATE AND TIME", "DURATION", "EMAIL ADDRESS", "TEAMS", "STATUS"],
      ["Food Drive", "2026-09-12", 26, "", "STUCO", "Active"],
    ] });
    const result = analyzeReports({ teamReport: team(), upcomingReport: report, schoolYearStart: "2026-08-01", schoolYearEnd: "2027-07-31", capHours: 25 });
    expect(result.volunteers.find((volunteer) => !volunteer.email)?.events[0].draft).toBeUndefined();
  });

  it("adds roster performance while retaining zero-activity students", () => {
    const result = analyzeReports({ teamReport: team(), upcomingReport: upcoming(), rosterReport: roster(), schoolYearStart: "2026-08-01", schoolYearEnd: "2027-07-31", capHours: 25 });
    expect(result.performance?.students).toHaveLength(2);
    expect(result.performance?.students.find((student) => student.name === "No Activity")?.validatedHours).toBe(0);
    expect(result.teamMetrics).toMatchObject({ rosterSize: 2, activeVolunteers: 1, zeroHourVolunteers: 1 });
    expect(result.teamMetrics?.periods.length).toBeGreaterThan(0);
  });

  it("omits roster-only results when no roster is provided", () => {
    const result = analyzeReports({ teamReport: team(), upcomingReport: upcoming(), schoolYearStart: "2026-08-01", schoolYearEnd: "2027-07-31", capHours: 25 });
    expect(result.performance).toBeUndefined();
    expect(result.teamMetrics).toBeUndefined();
  });
});
