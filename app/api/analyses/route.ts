import { analyzeReports } from "../../../src/analysis/service";
import type { ValidationIssue } from "../../../src/analysis/types";
import { getStorageEnvironment, listAnalyses, requireActiveMember, saveAnalysis } from "../../../src/server/repository";
import { AuthorizationError } from "../../../src/server/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const json = (body: unknown, status: number) => Response.json(body, { status });
const issue = (code: string, message: string): ValidationIssue => ({ code, message });
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).valueOf());

export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try { form = await request.formData(); }
  catch { return json({ ok: false, issues: [issue("INVALID_FORM", "Submit both reports using the analysis form.")] }, 400); }

  const teamReport = form.get("teamReport");
  const upcomingReport = form.get("upcomingReport");
  const rosterReport = form.get("rosterReport");
  const schoolYearStart = String(form.get("schoolYearStart") ?? "");
  const schoolYearEnd = String(form.get("schoolYearEnd") ?? "");
  const capHours = Number(form.get("capHours"));
  const issues: ValidationIssue[] = [];
  const files = [["Team Report", teamReport], ["Upcoming Opportunities report", upcomingReport]] as const;
  for (const [label, value] of files) {
    if (!(value instanceof File)) issues.push(issue("MISSING_FILE", `${label} is required.`));
    else {
      if (!value.name.toLowerCase().endsWith(".xlsx")) issues.push(issue("UNSUPPORTED_FILE", `${label} must be an .xlsx file.`));
      if (value.size > MAX_FILE_SIZE) issues.push(issue("FILE_TOO_LARGE", `${label} must be 10 MiB or smaller.`));
    }
  }
  if (rosterReport != null) {
    if (!(rosterReport instanceof File)) issues.push(issue("INVALID_ROSTER_FILE", "Full Roster must be an .xlsx file."));
    else {
      if (!rosterReport.name.toLowerCase().endsWith(".xlsx")) issues.push(issue("UNSUPPORTED_ROSTER_FILE", "Full Roster must be an .xlsx file."));
      if (rosterReport.size > MAX_FILE_SIZE) issues.push(issue("ROSTER_FILE_TOO_LARGE", "Full Roster must be 10 MiB or smaller."));
    }
  }
  if (!isDate(schoolYearStart)) issues.push(issue("INVALID_START_DATE", "Choose a valid school-year start date."));
  if (!isDate(schoolYearEnd)) issues.push(issue("INVALID_END_DATE", "Choose a valid school-year end date."));
  if (isDate(schoolYearStart) && isDate(schoolYearEnd) && schoolYearEnd < schoolYearStart) issues.push(issue("INVALID_DATE_RANGE", "The school-year end must be on or after the start."));
  if (!Number.isFinite(capHours) || capHours <= 0) issues.push(issue("INVALID_CAP", "The hour cap must be greater than zero."));
  if (issues.length) return json({ ok: false, issues }, 400);

  try {
    const teamBytes = await (teamReport as File).arrayBuffer();
    const upcomingBytes = await (upcomingReport as File).arrayBuffer();
    const rosterBytes = rosterReport instanceof File ? await rosterReport.arrayBuffer() : undefined;
    const analysis = analyzeReports({
      teamReport: teamBytes, upcomingReport: upcomingBytes, rosterReport: rosterBytes,
      schoolYearStart, schoolYearEnd, capHours,
    });
    if (analysis.issues.length) return json({ ok: false, issues: analysis.issues }, 400);
    if (String(form.get("save")) === "true") {
      const env = await getStorageEnvironment(); const actor = await requireActiveMember(env, request);
      const saved = await saveAnalysis(env, actor, { teamReport: teamBytes, upcomingReport: upcomingBytes, rosterReport: rosterBytes, teamFilename: (teamReport as File).name, upcomingFilename: (upcomingReport as File).name, rosterFilename: rosterReport instanceof File ? rosterReport.name : undefined, analysis });
      return json({ ok: true, saved: true, analysis: saved }, 201);
    }
    return json({ ok: true, analysis }, 200);
  } catch (error) {
    if (error instanceof AuthorizationError) return json({ ok: false, issues: [issue(error.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN", error.message)] }, error.status);
    if (error instanceof Error && /workbook/i.test(error.message)) return json({ ok: false, issues: [issue("INVALID_WORKBOOK", error.message)] }, 400);
    return json({ ok: false, issues: [issue("ANALYSIS_FAILED", "We could not analyze those reports. Please try again.")] }, 500);
  }
}

export async function GET(request: Request): Promise<Response> {
  try { const env = await getStorageEnvironment(); const actor = await requireActiveMember(env, request); return json({ ok: true, analyses: await listAnalyses(env, actor) }, 200); }
  catch (error) { if (error instanceof AuthorizationError) return json({ ok: false, issues: [issue(error.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN", error.message)] }, error.status); return json({ ok: false, issues: [issue("HISTORY_FAILED", "History is temporarily unavailable.")] }, 500); }
}
