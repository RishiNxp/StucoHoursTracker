export type AnalysisIssue = { code: string; message: string; sheet?: string; row?: number; column?: string };
export type AnalysisDraft = { subject: string; body: string; copyText: string };
export type AnalysisEvent = { volunteerKey: string; name: string; email: string | null; eventName: string; eventDate: string; durationHours: number; projectedHours: number; classification: "allowed" | "flagged" | "mandatory_exempt"; status: string | null; team: string | null; warning?: string; draft?: AnalysisDraft };
export type AnalysisVolunteer = { volunteerKey: string; name: string; email: string | null; currentValidatedHours: number; warnings: string[]; events: AnalysisEvent[] };
export type AnalysisViewModel = { configuration: { schoolYearStart: string; schoolYearEnd: string; schoolYearLabel: string; capHours: number }; summary: { volunteers: number; flaggedOptionalEvents: number; mandatoryExemptEvents: number; warnings: number }; volunteers: AnalysisVolunteer[]; issues: AnalysisIssue[] };
