import type { AnalyzeReportsResult } from "../analysis/service";
export { OfficerConflictError } from "./officer-types";
export type { OfficerInvitation, OfficerMembership, OfficersSnapshot } from "./officer-types";
export type Actor = { userId: string; email: string; displayName: string; organizationId: string };
export type D1PreparedStatement = { bind(...values: unknown[]): D1PreparedStatement; first<T>(): Promise<T | null>; all<T>(): Promise<{ results: T[] }>; run(): Promise<unknown> };
export type D1Database = { prepare(sql: string): D1PreparedStatement; batch(statements: D1PreparedStatement[]): Promise<unknown> };
export type R2Bucket = { put(key: string, value: ArrayBuffer, options?: Record<string, unknown>): Promise<unknown>; delete(key: string): Promise<unknown> };
export type StorageEnvironment = { DB: D1Database; UPLOADS: R2Bucket; ORGANIZATION_ID?: string; NODE_ENV?: string; STUCO_DEV_AUTH?: string; STUCO_DEV_ORGANIZATION_ID?: string; STUCO_PUBLIC_APP_ORIGIN?: string };
export type SaveAnalysisInput = { teamReport: ArrayBuffer; upcomingReport: ArrayBuffer; rosterReport?: ArrayBuffer; teamFilename: string; upcomingFilename: string; rosterFilename?: string; analysis: AnalyzeReportsResult };
export type HistoryItem = { id: string; createdAt: string; createdBy: string; schoolYearLabel: string; capHours: number; volunteerCount: number; flaggedOptionalEvents: number; warnings: number };
export type SavedAnalysis = HistoryItem & { configuration: AnalyzeReportsResult["configuration"]; summary: AnalyzeReportsResult["summary"]; volunteers: AnalyzeReportsResult["volunteers"]; performance?: AnalyzeReportsResult["performance"]; teamMetrics?: AnalyzeReportsResult["teamMetrics"]; uploads: Array<{ kind: string; filename: string; createdAt: string }> };
export class AuthorizationError extends Error { constructor(public readonly status: 401 | 403, message: string) { super(message); } }
