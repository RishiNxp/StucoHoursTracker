import type { HistoryRow, NormalizedHistory, NormalizedRoster, NormalizedUpcoming, RosterStudent, UpcomingRow, ValidationIssue, WorkbookLike } from "./types";

const excelDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    return Number.isNaN(date.valueOf()) ? null : date;
  }
  if (typeof value === "string" && value.trim()) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? null : date; }
  return null;
};
const durationHours = (value: unknown): number | null => {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number > 0 && number < 1 ? number * 24 : number;
};
const text = (value: unknown) => typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
const email = (value: unknown) => { const result = text(value).toLowerCase(); return result || null; };
const issue = (code: string, message: string, sheet: string, row?: number, column?: string): ValidationIssue => ({ code, message, sheet, row, column });
const requireSheet = (book: WorkbookLike, name: string, columns: string[]): { rows: Array<Record<string, unknown>>; issues: ValidationIssue[] } => {
  const rows = book.sheets[name]; if (!rows) return { rows: [], issues: [issue("MISSING_SHEET", `Required sheet “${name}” was not found.`, name)] };
  const header = rows[0] ?? {}; const issues = columns.filter((column) => !(column in header)).map((column) => issue("MISSING_COLUMN", `Required column “${column}” is missing.`, name, 1, column));
  return { rows: rows.slice(1), issues };
};

export function normalizeTeamReport(book: WorkbookLike): NormalizedHistory {
  const required = ["VOLUNTEER NAME", "DURATION (HRS)", "ATTENDANCE", "DATE AND TIME", "OPPORTUNITY", "VOLUNTEER EMAIL", "OPP ID"];
  const { rows, issues } = requireSheet(book, "Commitments", required); const output: HistoryRow[] = [];
  rows.forEach((row, index) => { if (!text(row["VOLUNTEER NAME"])) return; const date = excelDate(row["DATE AND TIME"]); const hours = durationHours(row["DURATION (HRS)"]); if (!date) issues.push(issue("INVALID_DATE", "Event date/time is invalid.", "Commitments", index + 2, "DATE AND TIME")); if (hours == null) issues.push(issue("INVALID_DURATION", "Event duration is invalid.", "Commitments", index + 2, "DURATION (HRS)")); if (date && hours != null) output.push({ volunteerKey: email(row["VOLUNTEER EMAIL"]) ?? text(row["VOLUNTEER NAME"]).toLowerCase(), name: text(row["VOLUNTEER NAME"]), email: email(row["VOLUNTEER EMAIL"]), hours, attendance: text(row["ATTENDANCE"]), eventName: text(row["OPPORTUNITY"]), eventId: text(row["OPP ID"]) || null, eventDate: date }); });
  return { rows: output, issues };
}

export function normalizeUpcomingReport(book: WorkbookLike): NormalizedUpcoming {
  const required = ["OPPORTUNITY", "DATE AND TIME", "DURATION", "EMAIL ADDRESS", "TEAMS"];
  const { rows, issues } = requireSheet(book, "Opportunity Volunteers", required); const output: UpcomingRow[] = [];
  rows.forEach((row, index) => { const name = text(row["OPPORTUNITY"]); if (!name) return; const date = excelDate(row["DATE AND TIME"]); const hours = durationHours(row["DURATION"]); const mail = email(row["EMAIL ADDRESS"]); const status = text(row["STATUS"]) || null; if (!date) issues.push(issue("INVALID_DATE", "Upcoming event date/time is invalid.", "Opportunity Volunteers", index + 2, "DATE AND TIME")); if (hours == null) issues.push(issue("INVALID_DURATION", "Upcoming event duration is invalid.", "Opportunity Volunteers", index + 2, "DURATION")); if (date && hours != null) output.push({ volunteerKey: mail ?? `missing-email:Opportunity Volunteers:${index + 2}`, name: mail ?? `Volunteer on row ${index + 2}`, email: mail, eventName: name, eventDate: date, durationHours: hours, status, team: text(row["TEAMS"]) || null, warning: status ? undefined : `Registration status is missing for ${name}.` }); });
  return { rows: output, issues };
}

const rosterNameAliases = ["volunteer name", "student name", "name", "full name"];
const rosterEmailAliases = ["volunteer email", "email", "email address", "student email"];
const rosterFirstNameAliases = ["first name", "firstname"];
const rosterLastNameAliases = ["last name", "lastname"];
const normalizedHeader = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const findHeader = (row: Record<string, unknown>, aliases: string[]) => Object.keys(row).find((key) => aliases.includes(normalizedHeader(key)));
const normalizedName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export function normalizeRosterReport(book: WorkbookLike): NormalizedRoster {
  const entries = Object.entries(book.sheets);
  for (const [sheet, sheetRows] of entries) {
    const header = sheetRows[0] ?? {};
    const nameColumn = findHeader(header, rosterNameAliases);
    const firstNameColumn = findHeader(header, rosterFirstNameAliases);
    const lastNameColumn = findHeader(header, rosterLastNameAliases);
    if (!nameColumn && !(firstNameColumn && lastNameColumn)) continue;
    const emailColumn = findHeader(header, rosterEmailAliases);
    const merged = new Map<string, RosterStudent>();
    for (const row of sheetRows.slice(1)) {
      const name = nameColumn ? text(row[nameColumn]) : `${text(row[firstNameColumn!])} ${text(row[lastNameColumn!])}`.trim();
      if (!name) continue;
      const mail = emailColumn ? email(row[emailColumn]) : null;
      const key = mail ?? normalizedName(name);
      const existing = merged.get(key);
      if (!existing) { merged.set(key, { volunteerKey: key, name, email: mail, warnings: [] }); continue; }
      if (normalizedName(existing.name) !== normalizedName(name)) existing.warnings.push(`Conflicting roster names share ${mail ?? key}.`);
      existing.warnings = [...new Set(existing.warnings)];
    }
    const rows = [...merged.values()];
    return rows.length ? { rows, issues: [] } : { rows: [], issues: [issue("EMPTY_ROSTER", "The roster does not contain any students.", sheet)] };
  }
  const sheet = entries[0]?.[0] ?? "Roster";
  return { rows: [], issues: [issue("MISSING_ROSTER_NAME_COLUMN", "The roster needs a combined name column or both First Name and Last Name columns.", sheet, 1)] };
}
