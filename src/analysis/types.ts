export type WorkbookLike = { sheets: Record<string, Array<Record<string, unknown>>> };

export type ValidationIssue = { code: string; message: string; sheet?: string; row?: number; column?: string };

export type HistoryRow = { volunteerKey: string; name: string; email: string | null; hours: number; attendance: string; eventName: string; eventId: string | null; eventDate: Date };
export type UpcomingRow = { volunteerKey: string; name: string; email: string | null; eventName: string; eventDate: Date; durationHours: number; status: string | null; team: string | null; warning?: string };
export type NormalizedHistory = { rows: HistoryRow[]; issues: ValidationIssue[] };
export type NormalizedUpcoming = { rows: UpcomingRow[]; issues: ValidationIssue[] };
export type RosterStudent = { volunteerKey: string; name: string; email: string | null; warnings: string[] };
export type NormalizedRoster = { rows: RosterStudent[]; issues: ValidationIssue[] };

export type PerformanceGroup = "developing" | "steady" | "top";
export type PerformanceStudent = RosterStudent & { validatedHours: number; completedOpportunities: number; combinedScore: number; group: PerformanceGroup };
export type PerformanceResult = { students: PerformanceStudent[]; summary: Record<PerformanceGroup, number>; boundaries: { lower: number; upper: number } | null };
export type PerformanceSortKey = "combinedScore" | "validatedHours" | "completedOpportunities" | "name";

export type TeamMetricPeriod = {
  startDate: string;
  endDate: string;
  periodHours: number;
  cumulativeHours: number;
};
export type TeamMetricsResult = {
  rosterSize: number;
  totalHours: number;
  participationRate: number;
  averageHours: number;
  medianHours: number;
  activeVolunteers: number;
  zeroHourVolunteers: number;
  completedOpportunities: number;
  minimumHours: number;
  maximumHours: number;
  periods: TeamMetricPeriod[];
};

export type EventClassification = "allowed" | "flagged" | "mandatory_exempt";
export type ClassifiedEvent = UpcomingRow & { projectedHours: number; classification: EventClassification; warning?: string };
export type VolunteerResult = { volunteerKey: string; name: string; email: string | null; currentValidatedHours: number; events: ClassifiedEvent[]; warnings: string[] };
export type ClassificationInput = { schoolYearStart: Date; schoolYearEnd: Date; capHours: number; history: HistoryRow[]; upcoming: UpcomingRow[] };
export type ClassificationResult = { volunteers: VolunteerResult[]; summary: { volunteers: number; flaggedOptionalEvents: number; mandatoryExemptEvents: number; warnings: number } };
