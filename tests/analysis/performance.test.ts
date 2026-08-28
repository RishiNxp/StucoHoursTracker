import { describe, expect, it } from "vitest";
import { normalizeRosterReport } from "../../src/analysis/normalize";
import { buildPerformanceResult, sortPerformanceStudents } from "../../src/analysis/performance";
import type { HistoryRow, RosterStudent, WorkbookLike } from "../../src/analysis/types";

const start = new Date("2026-08-01T00:00:00.000Z");
const end = new Date("2027-07-31T23:59:59.999Z");
const roster = (...names: string[]): RosterStudent[] => names.map((name) => ({ volunteerKey: name.toLowerCase(), name, email: null, warnings: [] }));
const validated = (name: string, hours: number, eventId: string, email: string | null = null, eventDate = new Date("2026-09-01T00:00:00.000Z")): HistoryRow => ({ volunteerKey: email ?? name.toLowerCase(), name, email, hours, attendance: "Validated", eventName: `Event ${eventId}`, eventId, eventDate });

describe("normalizeRosterReport", () => {
  it("finds common aliases and merges duplicate emails", () => {
    const book: WorkbookLike = { sheets: { Roster: [
      { "Student Name": "Student Name", "Email Address": "Email Address" },
      { "Student Name": "Jordan One", "Email Address": "JORDAN@example.com" },
      { "Student Name": "Jordan One", "Email Address": "jordan@example.com" },
    ] } };
    const result = normalizeRosterReport(book);
    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([{ volunteerKey: "jordan@example.com", name: "Jordan One", email: "jordan@example.com", warnings: [] }]);
  });

  it("reads Helper Helper roster exports with separate first and last names", () => {
    const book: WorkbookLike = { sheets: { Volunteers: [
      { "Email Address": "Email Address", "Last Name": "Last Name", "First Name": "First Name", Team: "Team" },
      { "Email Address": "ABIKILIE401@RSDMO.ORG", "Last Name": "Bikilie", "First Name": "Alexia", Team: "STUCO 26-27" },
      { "Email Address": "ochandge033@rsdmo.org", "Last Name": "Chandge", "First Name": "Om", Team: "STUCO 26-27" },
    ] } };
    const result = normalizeRosterReport(book);
    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      { volunteerKey: "abikilie401@rsdmo.org", name: "Alexia Bikilie", email: "abikilie401@rsdmo.org", warnings: [] },
      { volunteerKey: "ochandge033@rsdmo.org", name: "Om Chandge", email: "ochandge033@rsdmo.org", warnings: [] },
    ]);
  });

  it("returns an actionable issue when no name header exists", () => {
    const result = normalizeRosterReport({ sheets: { Roster: [{ Email: "Email" }, { Email: "a@example.com" }] } });
    expect(result.issues[0]).toMatchObject({ code: "MISSING_ROSTER_NAME_COLUMN", sheet: "Roster" });
  });
});

describe("buildPerformanceResult", () => {
  it("keeps a half-zero roster together in developing", () => {
    const result = buildPerformanceResult(roster("A", "B", "C", "D"), [validated("C", 5, "c"), validated("D", 5, "d1"), validated("D", 5, "d2")], start, end);
    expect(result.students.filter((student) => student.group === "developing").map((student) => student.name)).toEqual(["A", "B"]);
  });

  it("puts an all-zero roster in developing", () => {
    expect(buildPerformanceResult(roster("A", "B"), [], start, end).summary).toEqual({ developing: 2, steady: 0, top: 0 });
  });

  it("puts an equal non-zero roster in steady", () => {
    const history = [validated("A", 5, "a"), validated("B", 5, "b")];
    expect(buildPerformanceResult(roster("A", "B"), history, start, end).summary).toEqual({ developing: 0, steady: 2, top: 0 });
  });

  it("counts duplicate opportunity IDs once and excludes out-of-year activity", () => {
    const history = [validated("A", 2, "same"), validated("A", 2, "same"), validated("A", 50, "old", null, new Date("2025-09-01T00:00:00.000Z"))];
    const student = buildPerformanceResult(roster("A"), history, start, end).students[0];
    expect(student.validatedHours).toBe(4);
    expect(student.completedOpportunities).toBe(1);
  });

  it("matches by normalized email before name", () => {
    const students: RosterStudent[] = [{ volunteerKey: "jordan@example.com", name: "Roster Name", email: "jordan@example.com", warnings: [] }];
    const student = buildPerformanceResult(students, [validated("Report Name", 7.25, "1", "jordan@example.com")], start, end).students[0];
    expect(student.validatedHours).toBe(7.25);
  });

  it("does not combine ambiguous name-only histories", () => {
    const history = [validated("Jordan", 4, "1", "one@example.com"), validated("Jordan", 8, "2", "two@example.com")];
    const student = buildPerformanceResult(roster("Jordan"), history, start, end).students[0];
    expect(student.validatedHours).toBe(0);
    expect(student.warnings.join(" ")).toMatch(/ambiguous/i);
  });

  it("uses equal-weight normalized hours and opportunity counts", () => {
    const history = [validated("A", 10, "a1"), validated("B", 10, "b1"), validated("B", 10, "b2")];
    const result = buildPerformanceResult(roster("A", "B"), history, start, end);
    expect(result.students.find((student) => student.name === "A")?.combinedScore).toBe(50);
    expect(result.students.find((student) => student.name === "B")?.combinedScore).toBe(100);
  });

  it("keeps tied boundary scores in one group", () => {
    const history = [validated("B", 5, "b"), validated("C", 5, "c"), validated("D", 10, "d")];
    const result = buildPerformanceResult(roster("A", "B", "C", "D"), history, start, end);
    expect(result.students.find((student) => student.name === "B")?.group).toBe(result.students.find((student) => student.name === "C")?.group);
  });

  it("sorts without mutating group membership", () => {
    const result = buildPerformanceResult(roster("Zed", "Amy"), [validated("Zed", 5, "z"), validated("Amy", 10, "a")], start, end);
    const groups = new Map(result.students.map((student) => [student.name, student.group]));
    expect(sortPerformanceStudents(result.students, "name").map((student) => student.name)).toEqual(["Amy", "Zed"]);
    expect(sortPerformanceStudents(result.students, "validatedHours").map((student) => student.name)).toEqual(["Amy", "Zed"]);
    expect(result.students.every((student) => groups.get(student.name) === student.group)).toBe(true);
  });
});
