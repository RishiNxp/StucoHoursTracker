import { describe, expect, it } from "vitest";
import { buildTeamMetrics } from "../../src/analysis/team-metrics";
import type { HistoryRow, RosterStudent } from "../../src/analysis/types";

const start = new Date("2026-08-01T00:00:00.000Z");
const end = new Date("2027-07-31T23:59:59.999Z");
const roster = (...students: Array<[string, string | null]>) => students.map(([name, email]) => ({ volunteerKey: email ?? name.toLowerCase(), name, email, warnings: [] })) satisfies RosterStudent[];
const validated = (name: string, hours: number, eventId: string | null, options: Partial<HistoryRow> = {}): HistoryRow => ({
  volunteerKey: options.email ?? name.toLowerCase(),
  name,
  email: null,
  hours,
  attendance: "Validated",
  eventName: "Volunteer Event",
  eventId,
  eventDate: start,
  ...options,
});

describe("buildTeamMetrics", () => {
  it("aggregates roster-wide metrics and fourteen-day periods", () => {
    const result = buildTeamMetrics([
      ...roster(["A", null], ["B", null], ["C", null]),
    ], [
      validated("A", 2, "kickoff"),
      validated("A", 4, "kickoff", { eventDate: new Date("2026-08-14T00:00:00.000Z") }),
      validated("A", 2, "second", { eventDate: new Date("2026-08-15T00:00:00.000Z") }),
      validated("B", 4, "final", { eventDate: end }),
    ], start, end);

    expect(result).toMatchObject({
      rosterSize: 3,
      totalHours: 12,
      participationRate: 66.67,
      averageHours: 4,
      medianHours: 4,
      activeVolunteers: 2,
      zeroHourVolunteers: 1,
      completedOpportunities: 3,
      minimumHours: 0,
      maximumHours: 8,
    });
    expect(result.periods[0].periodHours).toBe(6);
    expect(result.periods[1].periodHours).toBe(2);
    expect(result.periods.at(-1)?.cumulativeHours).toBe(12);
  });

  it("uses the middle pair to calculate an even-roster median", () => {
    const result = buildTeamMetrics(roster(["A", null], ["B", null], ["C", null], ["D", null]), [
      validated("A", 1, "a"),
      validated("B", 3, "b"),
      validated("C", 7, "c"),
      validated("D", 11, "d"),
    ], start, end);

    expect(result.medianHours).toBe(5);
  });

  it("uses the lowest active total for the minimum when every roster member is active", () => {
    const result = buildTeamMetrics(roster(["A", null], ["B", null]), [
      validated("A", 2, "a"),
      validated("B", 5, "b"),
    ], start, end);

    expect(result.minimumHours).toBe(2);
  });

  it("rounds the combined total after aggregating fractional hours across students", () => {
    const result = buildTeamMetrics(roster(["A", null], ["B", null]), [
      validated("A", 1.005, "a"),
      validated("B", 1.005, "b"),
    ], start, end);

    expect(result.totalHours).toBe(2.01);
    expect(result.periods[0].periodHours).toBe(2.01);
    expect(result.periods.at(-1)?.cumulativeHours).toBe(result.totalHours);
  });

  it("carries exact fractional hours across periods before rounding cumulative values", () => {
    const result = buildTeamMetrics(roster(["A", null]), [
      validated("A", 1.005, "first"),
      validated("A", 1.005, "second", { eventDate: new Date("2026-08-15T00:00:00.000Z") }),
    ], start, end);

    expect(result.periods.slice(0, 2).map((period) => period.periodHours)).toEqual([1.01, 1.01]);
    expect(result.totalHours).toBe(2.01);
    expect(result.periods[1].cumulativeHours).toBe(result.totalHours);
    expect(result.periods.at(-1)?.cumulativeHours).toBe(result.totalHours);
  });

  it("emits zero-filled periods when no activity occurs in a gap", () => {
    const result = buildTeamMetrics(roster(["A", null]), [
      validated("A", 5, "later", { eventDate: new Date("2026-09-12T00:00:00.000Z") }),
    ], start, end);

    expect(result.periods.slice(0, 3).map((period) => period.periodHours)).toEqual([0, 0, 0]);
    expect(result.periods[3]).toMatchObject({ startDate: "2026-09-12", endDate: "2026-09-25", periodHours: 5, cumulativeHours: 5 });
  });

  it("shortens the final period at the school-year end", () => {
    const shortEnd = new Date("2026-08-16T23:59:59.999Z");
    const result = buildTeamMetrics(roster(["A", null]), [], start, shortEnd);

    expect(result.periods).toEqual([
      { startDate: "2026-08-01", endDate: "2026-08-14", periodHours: 0, cumulativeHours: 0 },
      { startDate: "2026-08-15", endDate: "2026-08-16", periodHours: 0, cumulativeHours: 0 },
    ]);
  });

  it("ignores invalid attendance and activity outside the school year", () => {
    const result = buildTeamMetrics(roster(["A", null]), [
      validated("A", 3, "valid"),
      validated("A", 30, "unvalidated", { attendance: "Pending" }),
      validated("A", 30, "before", { eventDate: new Date("2026-07-31T23:59:59.999Z") }),
      validated("A", 30, "after", { eventDate: new Date("2027-08-01T00:00:00.000Z") }),
    ], start, end);

    expect(result.totalHours).toBe(3);
    expect(result.completedOpportunities).toBe(1);
  });

  it("counts duplicate opportunity IDs once while retaining all validated hours", () => {
    const result = buildTeamMetrics(roster(["A", null]), [
      validated("A", 2, "same"),
      validated("A", 3, "same", { eventDate: new Date("2026-08-02T00:00:00.000Z") }),
    ], start, end);

    expect(result).toMatchObject({ totalHours: 5, completedOpportunities: 1 });
  });

  it("uses normalized event name and timestamp when an opportunity ID is missing", () => {
    const result = buildTeamMetrics(roster(["A", null]), [
      validated("A", 2, null, { eventName: "  Food Drive ", eventDate: new Date("2026-08-03T00:00:00.000Z") }),
      validated("A", 3, null, { eventName: "food drive", eventDate: new Date("2026-08-03T00:00:00.000Z") }),
    ], start, end);

    expect(result).toMatchObject({ totalHours: 5, completedOpportunities: 1 });
  });

  it("refuses ambiguous name-only matches", () => {
    const result = buildTeamMetrics(roster(["Jordan", null]), [
      validated("Jordan", 4, "one", { email: "one@example.com" }),
      validated("Jordan", 8, "two", { email: "two@example.com" }),
    ], start, end);

    expect(result).toMatchObject({ totalHours: 0, activeVolunteers: 0, completedOpportunities: 0 });
  });

  it("does not assign one name-only row to duplicate roster names", () => {
    const result = buildTeamMetrics(roster(
      ["Jordan Lee", "jordan.one@example.com"],
      ["  jordan   lee ", "jordan.two@example.com"],
    ), [
      validated("JORDAN LEE", 4, "shared-name"),
    ], start, end);

    expect(result).toMatchObject({ totalHours: 0, activeVolunteers: 0, completedOpportunities: 0 });
  });

  it("matches email before a conflicting name", () => {
    const result = buildTeamMetrics(roster(["Roster Name", "jordan@example.com"]), [
      validated("Report Name", 7.25, "email-match", { email: "JORDAN@example.com" }),
    ], start, end);

    expect(result).toMatchObject({ totalHours: 7.25, activeVolunteers: 1, completedOpportunities: 1 });
  });
});
