import type { HistoryRow, RosterStudent, TeamMetricPeriod, TeamMetricsResult } from "./types";

const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const roundHundredths = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const opportunityKey = (row: HistoryRow) => row.eventId ?? `${row.eventName.trim().toLowerCase()}|${row.eventDate.toISOString()}`;
const inRange = (date: Date, start: Date, end: Date) => date >= start && date <= end;
const dateLabel = (date: Date) => date.toISOString().slice(0, 10);
const addUtcDays = (date: Date, days: number) => new Date(Date.UTC(
  date.getUTCFullYear(),
  date.getUTCMonth(),
  date.getUTCDate() + days,
  date.getUTCHours(),
  date.getUTCMinutes(),
  date.getUTCSeconds(),
  date.getUTCMilliseconds(),
));

const appendRow = (index: Map<string, HistoryRow[]>, key: string, row: HistoryRow) => {
  index.set(key, [...(index.get(key) ?? []), row]);
};

const matchedRowsForStudent = (student: RosterStudent, byEmail: Map<string, HistoryRow[]>, byName: Map<string, HistoryRow[]>, rosterNameCounts: Map<string, number>) => {
  let rows = student.email ? (byEmail.get(student.email.toLowerCase()) ?? []) : [];
  const normalizedName = normalizeName(student.name);
  if (!rows.length && rosterNameCounts.get(normalizedName) === 1) {
    const nameRows = byName.get(normalizedName) ?? [];
    const identities = new Set(nameRows.map((row) => row.email ?? row.volunteerKey));
    if (identities.size <= 1) rows = nameRows;
  }
  return rows;
};

export function buildTeamMetrics(roster: RosterStudent[], history: HistoryRow[], schoolYearStart: Date, schoolYearEnd: Date): TeamMetricsResult {
  const eligible = history.filter((row) => row.attendance.trim().toLowerCase() === "validated" && inRange(row.eventDate, schoolYearStart, schoolYearEnd));
  const byEmail = new Map<string, HistoryRow[]>();
  const byName = new Map<string, HistoryRow[]>();
  for (const row of eligible) {
    if (row.email) appendRow(byEmail, row.email.toLowerCase(), row);
    appendRow(byName, normalizeName(row.name), row);
  }

  const rosterNameCounts = new Map<string, number>();
  for (const student of roster) {
    const normalizedName = normalizeName(student.name);
    rosterNameCounts.set(normalizedName, (rosterNameCounts.get(normalizedName) ?? 0) + 1);
  }

  const rowsByStudent = roster.map((student) => matchedRowsForStudent(student, byEmail, byName, rosterNameCounts));
  const matchedRows = rowsByStudent.flat().sort((left, right) => left.eventDate.getTime() - right.eventDate.getTime());
  const hoursByStudent = rowsByStudent.map((rows) => rows.reduce((sum, row) => sum + row.hours, 0));
  const exactTotalHours = matchedRows.reduce((sum, row) => sum + row.hours, 0);
  const totalHours = roundHundredths(exactTotalHours);
  const activeVolunteers = hoursByStudent.filter((hours) => hours > 0).length;
  const sortedHours = [...hoursByStudent].sort((a, b) => a - b);
  const middle = Math.floor(sortedHours.length / 2);
  const medianHours = sortedHours.length === 0 ? 0 : roundHundredths(sortedHours.length % 2 === 1 ? sortedHours[middle] : (sortedHours[middle - 1] + sortedHours[middle]) / 2);
  const periods = buildPeriods(matchedRows, schoolYearStart, schoolYearEnd);

  return {
    rosterSize: roster.length,
    totalHours,
    participationRate: roundHundredths(roster.length ? (activeVolunteers / roster.length) * 100 : 0),
    averageHours: roundHundredths(roster.length ? exactTotalHours / roster.length : 0),
    medianHours,
    activeVolunteers,
    zeroHourVolunteers: roster.length - activeVolunteers,
    completedOpportunities: new Set(matchedRows.map(opportunityKey)).size,
    minimumHours: roundHundredths(hoursByStudent.length ? Math.min(...hoursByStudent) : 0),
    maximumHours: roundHundredths(Math.max(0, ...hoursByStudent)),
    periods,
  };
}

function buildPeriods(rows: HistoryRow[], schoolYearStart: Date, schoolYearEnd: Date): TeamMetricPeriod[] {
  const periods: TeamMetricPeriod[] = [];
  const inclusiveEnd = new Date(schoolYearEnd.getTime() + 1);
  let cursor = schoolYearStart;
  let cumulativeHours = 0;
  while (cursor < inclusiveEnd) {
    const exclusiveEnd = new Date(Math.min(addUtcDays(cursor, 14).getTime(), inclusiveEnd.getTime()));
    const periodRows = rows.filter((row) => row.eventDate >= cursor && row.eventDate < exclusiveEnd);
    const exactPeriodHours = periodRows.reduce((sum, row) => sum + row.hours, 0);
    cumulativeHours = periodRows.reduce((sum, row) => sum + row.hours, cumulativeHours);
    periods.push({
      startDate: dateLabel(cursor),
      endDate: dateLabel(new Date(exclusiveEnd.getTime() - 1)),
      periodHours: roundHundredths(exactPeriodHours),
      cumulativeHours: roundHundredths(cumulativeHours),
    });
    cursor = exclusiveEnd;
  }
  return periods;
}
