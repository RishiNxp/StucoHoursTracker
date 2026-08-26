import { classifyVolunteerHours } from "./classify";
import { buildVolunteerDraft, type Draft } from "./drafts";
import { normalizeTeamReport, normalizeUpcomingReport } from "./normalize";
import type { ClassificationResult, EventClassification, ValidationIssue } from "./types";
import { parseWorkbook } from "./workbook";

export type AnalyzeReportsInput = {
  teamReport: ArrayBuffer;
  upcomingReport: ArrayBuffer;
  schoolYearStart: string;
  schoolYearEnd: string;
  capHours: number;
};

export type SerializedEvent = {
  volunteerKey: string; name: string; email: string | null; eventName: string; eventDate: string;
  durationHours: number; projectedHours: number; classification: EventClassification; status: string | null;
  team: string | null; warning?: string; draft?: Draft;
};
export type SerializedVolunteer = {
  volunteerKey: string; name: string; email: string | null; currentValidatedHours: number;
  warnings: string[]; events: SerializedEvent[];
};
export type AnalyzeReportsResult = {
  configuration: { schoolYearStart: string; schoolYearEnd: string; schoolYearLabel: string; capHours: number };
  summary: ClassificationResult["summary"];
  volunteers: SerializedVolunteer[];
  issues: ValidationIssue[];
};

const emptySummary = { volunteers: 0, flaggedOptionalEvents: 0, mandatoryExemptEvents: 0, warnings: 0 };
const schoolYearLabel = (start: string, end: string) => `${start.slice(0, 4)}–${end.slice(0, 4)}`;

export function analyzeReports(input: AnalyzeReportsInput): AnalyzeReportsResult {
  const configuration = { schoolYearStart: input.schoolYearStart, schoolYearEnd: input.schoolYearEnd, schoolYearLabel: schoolYearLabel(input.schoolYearStart, input.schoolYearEnd), capHours: input.capHours };
  const history = normalizeTeamReport(parseWorkbook(input.teamReport));
  const upcoming = normalizeUpcomingReport(parseWorkbook(input.upcomingReport));
  const issues = [...history.issues, ...upcoming.issues];
  const seen = new Set<string>();
  for (const row of upcoming.rows) {
    const key = `${row.volunteerKey}|${row.eventName.toLowerCase()}|${row.eventDate.toISOString()}`;
    if (seen.has(key)) issues.push({ code: "DUPLICATE_REGISTRATION", message: `Duplicate registration for ${row.eventName}.`, sheet: "Opportunity Volunteers" });
    seen.add(key);
  }
  if (issues.length) return { configuration, summary: emptySummary, volunteers: [], issues };

  const result = classifyVolunteerHours({
    schoolYearStart: new Date(`${input.schoolYearStart}T00:00:00.000Z`),
    schoolYearEnd: new Date(`${input.schoolYearEnd}T23:59:59.999Z`),
    capHours: input.capHours, history: history.rows, upcoming: upcoming.rows,
  });
  const volunteers = result.volunteers.map((volunteer) => ({
    ...volunteer,
    events: volunteer.events.map((event) => ({
      ...event,
      eventDate: event.eventDate.toISOString(),
      draft: event.classification === "flagged" && volunteer.email ? buildVolunteerDraft({
        name: volunteer.name, currentHours: volunteer.currentValidatedHours, projectedHours: event.projectedHours,
        eventName: event.eventName, eventDate: event.eventDate, schoolYearLabel: configuration.schoolYearLabel, capHours: input.capHours,
      }) : undefined,
    })),
  }));
  return { configuration, summary: result.summary, volunteers, issues: [] };
}
