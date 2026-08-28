import type { HistoryRow, PerformanceGroup, PerformanceResult, PerformanceSortKey, PerformanceStudent, RosterStudent } from "./types";

const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const roundHundredths = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const nearestRank = (sorted: number[], percentile: number) => sorted[Math.max(0, Math.ceil(percentile * sorted.length) - 1)];
const inRange = (date: Date, start: Date, end: Date) => date >= start && date <= end;

const sortRows = (students: PerformanceStudent[], key: PerformanceSortKey) => [...students].sort((a, b) => {
  if (key === "name") return a.name.localeCompare(b.name);
  const difference = b[key] - a[key];
  return difference || a.name.localeCompare(b.name);
});

export function sortPerformanceStudents(students: PerformanceStudent[], key: PerformanceSortKey): PerformanceStudent[] {
  return sortRows(students, key);
}

export function buildPerformanceResult(roster: RosterStudent[], history: HistoryRow[], start: Date, end: Date): PerformanceResult {
  const eligible = history.filter((row) => row.attendance.trim().toLowerCase() === "validated" && inRange(row.eventDate, start, end));
  const byEmail = new Map<string, HistoryRow[]>();
  const byName = new Map<string, HistoryRow[]>();
  for (const row of eligible) {
    if (row.email) byEmail.set(row.email.toLowerCase(), [...(byEmail.get(row.email.toLowerCase()) ?? []), row]);
    const name = normalizeName(row.name);
    byName.set(name, [...(byName.get(name) ?? []), row]);
  }

  const activity = roster.map((student) => {
    let rows = student.email ? (byEmail.get(student.email.toLowerCase()) ?? []) : [];
    const warnings = [...student.warnings];
    if (!rows.length) {
      const nameRows = byName.get(normalizeName(student.name)) ?? [];
      const identities = new Set(nameRows.map((row) => row.email ?? row.volunteerKey));
      if (identities.size > 1) warnings.push(`Activity match for ${student.name} is ambiguous; hours were not combined.`);
      else rows = nameRows;
    }
    const completed = new Set(rows.map((row) => row.eventId ?? `${row.eventName.trim().toLowerCase()}|${row.eventDate.toISOString()}`));
    return { ...student, warnings: [...new Set(warnings)], validatedHours: roundHundredths(rows.reduce((sum, row) => sum + row.hours, 0)), completedOpportunities: completed.size };
  });

  const maximumHours = Math.max(0, ...activity.map((student) => student.validatedHours));
  const maximumOpportunities = Math.max(0, ...activity.map((student) => student.completedOpportunities));
  const scored = activity.map((student) => ({
    ...student,
    combinedScore: roundHundredths(100 * (((maximumHours ? student.validatedHours / maximumHours : 0) + (maximumOpportunities ? student.completedOpportunities / maximumOpportunities : 0)) / 2)),
  }));
  const scores = scored.map((student) => student.combinedScore).sort((a, b) => a - b);
  const distinct = [...new Set(scores)];
  let boundaries: PerformanceResult["boundaries"] = null;
  const groupFor = (score: number): PerformanceGroup => {
    if (!scores.length || distinct.length === 1) return distinct[0] === 0 ? "developing" : "steady";
    if (distinct.length === 2) return score === distinct[0] ? "developing" : "top";
    boundaries ??= { lower: nearestRank(scores, 1 / 3), upper: nearestRank(scores, 2 / 3) };
    if (score <= boundaries.lower) return "developing";
    if (score >= boundaries.upper) return "top";
    return "steady";
  };
  const students = sortRows(scored.map((student) => ({ ...student, group: groupFor(student.combinedScore) })), "combinedScore");
  const summary = students.reduce<Record<PerformanceGroup, number>>((counts, student) => { counts[student.group] += 1; return counts; }, { developing: 0, steady: 0, top: 0 });
  return { students, summary, boundaries };
}
