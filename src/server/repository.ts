import { createHash, randomUUID } from "node:crypto";
import { getChatGPTUser } from "../../app/chatgpt-auth";
import type { Actor, HistoryItem, SaveAnalysisInput, SavedAnalysis, StorageEnvironment } from "./types";
import { AuthorizationError } from "./types";

const now = () => new Date();
const iso = (value: unknown) => new Date(value as string | number | Date).toISOString();
export async function getStorageEnvironment(): Promise<StorageEnvironment> {
  const globalEnv = (globalThis as typeof globalThis & { __STUCO_ENV__?: StorageEnvironment }).__STUCO_ENV__;
  if (globalEnv?.DB && globalEnv.UPLOADS) return globalEnv;
  try {
    const cloudflare = await import("cloudflare:workers");
    const env = cloudflare.env as StorageEnvironment;
    if (env?.DB && env.UPLOADS) return env;
  } catch {
    // Node-based unit tests do not provide the Cloudflare module.
  }
  throw new Error("Storage bindings are not configured.");
}
export async function requireActiveMember(env: StorageEnvironment, request: Request): Promise<Actor> {
  const dev = env.STUCO_DEV_AUTH === "true" && env.NODE_ENV !== "production";
  const user = dev ? { userId: "local-demo", email: "demo@stuco.local", displayName: "Local Demo Officer" } : await getChatGPTUser();
  if (!user) throw new AuthorizationError(401, "Sign in with ChatGPT to continue.");
  const organizationId = dev ? (env.STUCO_DEV_ORGANIZATION_ID ?? "local-stuco") : env.ORGANIZATION_ID;
  if (!organizationId) throw new AuthorizationError(403, "This STUCO organization is not configured.");
  const membership = await env.DB.prepare("SELECT active FROM memberships WHERE organization_id = ? AND user_id = ? LIMIT 1").bind(organizationId, user.userId).first<{ active: number }>();
  if (!membership?.active) throw new AuthorizationError(403, "Your account is not an active STUCO officer.");
  return { userId: user.userId, email: user.email, displayName: user.displayName, organizationId };
}

export async function saveAnalysis(env: StorageEnvironment, actor: Actor, input: SaveAnalysisInput): Promise<SavedAnalysis> {
  const analysisId = randomUUID(); const createdAt = now(); const uploaded: string[] = [];
  const put = async (kind: string, filename: string, bytes: ArrayBuffer) => { const uploadId = randomUUID(); const key = `org/${actor.organizationId}/analyses/${analysisId}/${uploadId}.xlsx`; await env.UPLOADS.put(key, bytes, { httpMetadata: { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }, customMetadata: { filename, kind } }); uploaded.push(key); return { id: uploadId, key, kind, filename, sha256: createHash("sha256").update(new Uint8Array(bytes)).digest("hex") }; };
  try {
    const team = await put("team_report", input.teamFilename, input.teamReport); const upcoming = await put("upcoming_report", input.upcomingFilename, input.upcomingReport);
    const roster = input.rosterReport && input.rosterFilename ? await put("roster_report", input.rosterFilename, input.rosterReport) : undefined;
    const a = input.analysis; const summary = JSON.stringify(a.summary); const configuration = JSON.stringify(a.configuration); const results = JSON.stringify({ snapshotVersion: 3, volunteers: a.volunteers, performance: a.performance, teamMetrics: a.teamMetrics });
    const uploadStatements = [team, upcoming, ...(roster ? [roster] : [])].map((upload) => env.DB.prepare("INSERT INTO uploads (id, organization_id, kind, filename, r2_key, sha256, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(upload.id, actor.organizationId, upload.kind, upload.filename, upload.key, upload.sha256, actor.userId, createdAt.getTime()));
    await env.DB.batch([
      ...uploadStatements,
      env.DB.prepare("INSERT INTO analyses (id, organization_id, school_year_start, school_year_end, cap_hours, status, summary_json, configuration_json, results_json, team_upload_id, upcoming_upload_id, roster_upload_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(analysisId, actor.organizationId, a.configuration.schoolYearStart, a.configuration.schoolYearEnd, a.configuration.capHours, "completed", summary, configuration, results, team.id, upcoming.id, roster?.id ?? null, actor.displayName, createdAt.getTime()),
      env.DB.prepare("INSERT INTO audit_events (id, organization_id, actor_user_id, action, entity_id, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(randomUUID(), actor.organizationId, actor.userId, "analysis_saved", analysisId, JSON.stringify({ volunteers: a.summary.volunteers, flaggedOptionalEvents: a.summary.flaggedOptionalEvents }), createdAt.getTime()),
    ]);
    return { id: analysisId, createdAt: createdAt.toISOString(), createdBy: actor.displayName, schoolYearLabel: a.configuration.schoolYearLabel, capHours: a.configuration.capHours, volunteerCount: a.summary.volunteers, flaggedOptionalEvents: a.summary.flaggedOptionalEvents, warnings: a.summary.warnings, configuration: a.configuration, summary: a.summary, volunteers: a.volunteers, performance: a.performance, teamMetrics: a.teamMetrics, uploads: [team, upcoming, ...(roster ? [roster] : [])].map((upload) => ({ kind: upload.kind, filename: upload.filename, createdAt: createdAt.toISOString() })) };
  } catch (error) { await Promise.all(uploaded.map((key) => env.UPLOADS.delete(key).catch(() => undefined))); throw error; }
}

export async function listAnalyses(env: StorageEnvironment, actor: Actor): Promise<HistoryItem[]> { const result = await env.DB.prepare("SELECT id, created_at, created_by, configuration_json, summary_json FROM analyses WHERE organization_id = ? AND status = 'completed' ORDER BY created_at DESC").bind(actor.organizationId).all<{ id: string; created_at: number; created_by: string; configuration_json: string; summary_json: string }>(); return result.results.map((row: { id: string; created_at: number; created_by: string; configuration_json: string; summary_json: string }) => { const c = JSON.parse(row.configuration_json); const s = JSON.parse(row.summary_json); return { id: row.id, createdAt: iso(row.created_at), createdBy: row.created_by, schoolYearLabel: c.schoolYearLabel, capHours: c.capHours, volunteerCount: s.volunteers, flaggedOptionalEvents: s.flaggedOptionalEvents, warnings: s.warnings }; }); }
export async function getAnalysis(env: StorageEnvironment, actor: Actor, id: string): Promise<SavedAnalysis | null> { const row = await env.DB.prepare("SELECT id, created_at, created_by, configuration_json, summary_json, results_json, team_upload_id, upcoming_upload_id, roster_upload_id FROM analyses WHERE organization_id = ? AND id = ? AND status = 'completed' LIMIT 1").bind(actor.organizationId, id).first<any>(); if (!row) return null; const uploads = await env.DB.prepare("SELECT kind, filename, created_at FROM uploads WHERE organization_id = ? AND id IN (?, ?, ?)").bind(actor.organizationId, row.team_upload_id, row.upcoming_upload_id, row.roster_upload_id).all<any>(); const c = JSON.parse(row.configuration_json); const s = JSON.parse(row.summary_json); const parsed = JSON.parse(row.results_json); const snapshot = Array.isArray(parsed) ? { volunteers: parsed, performance: undefined, teamMetrics: undefined } : { volunteers: parsed.volunteers ?? [], performance: parsed.performance, teamMetrics: parsed.teamMetrics }; return { id: row.id, createdAt: iso(row.created_at), createdBy: row.created_by, schoolYearLabel: c.schoolYearLabel, capHours: c.capHours, volunteerCount: s.volunteers, flaggedOptionalEvents: s.flaggedOptionalEvents, warnings: s.warnings, configuration: c, summary: s, volunteers: snapshot.volunteers, performance: snapshot.performance, teamMetrics: snapshot.teamMetrics, uploads: uploads.results.map((u: any) => ({ kind: u.kind, filename: u.filename, createdAt: iso(u.created_at) })) }; }
