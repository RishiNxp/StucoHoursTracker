import { describe, expect, it } from "vitest";
import { classifyVolunteerHours, normalizeUpcomingReport } from "../../src/analysis";
import type { ClassificationInput, HistoryRow, UpcomingRow } from "../../src/analysis";

const date = (iso: string) => new Date(`${iso}T12:00:00.000Z`);
const history = (hours: number): HistoryRow => ({
  volunteerKey: "student@example.com", name: "Student", email: "student@example.com",
  hours, attendance: "Validated", eventName: "Completed", eventId: "1", eventDate: date("2026-09-01"),
});
const upcoming = (eventName: string, day: string, durationHours: number, status = "Active"): UpcomingRow => ({
  volunteerKey: "student@example.com", name: "Student", email: "student@example.com",
  eventName, eventDate: date(day), durationHours, status, team: "STUCO",
});
const classify = (overrides: Partial<ClassificationInput> = {}) => classifyVolunteerHours({
  schoolYearStart: date("2026-08-01"), schoolYearEnd: date("2027-07-31"), capHours: 25,
  history: [history(24)], upcoming: [], ...overrides,
});

describe("classifyVolunteerHours", () => {
  it("allows exactly the cap and flags values above it", () => {
    const result = classify({ upcoming: [upcoming("One hour", "2026-09-10", 1), upcoming("Next", "2026-09-11", 0.5)] });
    expect(result.volunteers[0].events.map((event) => event.classification)).toEqual(["allowed", "flagged"]);
  });

  it("orders events chronologically and lets mandatory hours affect later optional events", () => {
    const result = classify({ upcoming: [upcoming("Optional", "2026-09-12", 1), upcoming("mandatory meeting", "2026-09-10", 1)] });
    expect(result.volunteers[0].events.map((event) => [event.eventName, event.classification, event.projectedHours])).toEqual([
      ["mandatory meeting", "mandatory_exempt", 25], ["Optional", "flagged", 26],
    ]);
  });

  it("rounds accumulated and projected hours to the hundredths place", () => {
    const result = classify({ history: [history(0.1), history(0.2)], upcoming: [upcoming("Fractional", "2026-09-10", 0.1)] });
    expect(result.volunteers[0].currentValidatedHours).toBe(0.3);
    expect(result.volunteers[0].events[0].projectedHours).toBe(0.4);
  });

  it("excludes inactive registrations and warns about ambiguous status", () => {
    const result = classify({ upcoming: [upcoming("Cancelled", "2026-09-10", 2, "Cancelled"), upcoming("Unknown", "2026-09-11", 1, "")] });
    expect(result.volunteers[0].events.map((event) => event.eventName)).toEqual(["Unknown"]);
    expect(result.volunteers[0].warnings.join(" ")).toMatch(/status/i);
  });
});

describe("normalizeUpcomingReport", () => {
  it("keeps missing-email registrations distinct instead of merging by event name", () => {
    const header = { OPPORTUNITY: "", "DATE AND TIME": "", DURATION: "", "EMAIL ADDRESS": "", TEAMS: "" };
    const row = { OPPORTUNITY: "Food Drive", "DATE AND TIME": "2026-09-12", DURATION: 2, "EMAIL ADDRESS": "", TEAMS: "STUCO", STATUS: "Active" };
    const result = normalizeUpcomingReport({ sheets: { "Opportunity Volunteers": [header, row, row] } });
    expect(result.rows.map((item) => item.volunteerKey)).toEqual([
      "missing-email:Opportunity Volunteers:2", "missing-email:Opportunity Volunteers:3",
    ]);
  });
});
