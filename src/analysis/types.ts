export type WorkbookLike = { sheets: Record<string, Array<Record<string, unknown>>> };

export type ValidationIssue = { code: string; message: string; sheet?: string; row?: number; column?: string };

export type HistoryRow = { volunteerKey: string; name: string; email: string | null; hours: number; attendance: string; eventName: string; eventId: string | null; eventDate: Date };
export type UpcomingRow = { volunteerKey: string; name: string; email: string | null; eventName: string; eventDate: Date; durationHours: number; status: string | null; team: string | null; warning?: string };
export type NormalizedHistory = { rows: HistoryRow[]; issues: ValidationIssue[] };
export type NormalizedUpcoming = { rows: UpcomingRow[]; issues: ValidationIssue[] };

export type EventClassification = "allowed" | "flagged" | "mandatory_exempt";
export type ClassifiedEvent = UpcomingRow & { projectedHours: number; classification: EventClassification; warning?: string };
export type VolunteerResult = { volunteerKey: string; name: string; email: string | null; currentValidatedHours: number; events: ClassifiedEvent[]; warnings: string[] };
export type ClassificationInput = { schoolYearStart: Date; schoolYearEnd: Date; capHours: number; history: HistoryRow[]; upcoming: UpcomingRow[] };
export type ClassificationResult = { volunteers: VolunteerResult[]; summary: { volunteers: number; flaggedOptionalEvents: number; mandatoryExemptEvents: number; warnings: number } };
