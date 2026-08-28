import type { ClassifiedEvent, ClassificationInput, ClassificationResult, UpcomingRow, VolunteerResult } from "./types";

const active = (row: UpcomingRow) => !row.status || !/(cancel|inactive|removed|declined)/i.test(row.status);
const inRange = (date: Date, start: Date, end: Date) => date >= start && date <= end;
const roundHours = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function classifyVolunteerHours(input: ClassificationInput): ClassificationResult {
  const current = new Map<string, VolunteerResult>();
  for (const row of input.history) {
    if (row.attendance.toLowerCase() !== "validated" || !inRange(row.eventDate, input.schoolYearStart, input.schoolYearEnd)) continue;
    const person = current.get(row.volunteerKey) ?? { volunteerKey: row.volunteerKey, name: row.name, email: row.email, currentValidatedHours: 0, events: [], warnings: [] };
    person.currentValidatedHours = roundHours(person.currentValidatedHours + row.hours); if (!person.email && row.email) person.email = row.email; current.set(row.volunteerKey, person);
  }
  for (const row of input.upcoming.filter(active).sort((a, b) => a.eventDate.valueOf() - b.eventDate.valueOf())) {
    const person = current.get(row.volunteerKey) ?? { volunteerKey: row.volunteerKey, name: row.name, email: row.email, currentValidatedHours: 0, events: [], warnings: [] };
    const previous = person.events.at(-1)?.projectedHours ?? person.currentValidatedHours; const projectedHours = roundHours(previous + row.durationHours); const mandatory = /mandatory/i.test(row.eventName);
    const alreadyFlagged = person.events.some((event) => event.classification === "flagged"); const classification = mandatory ? "mandatory_exempt" : alreadyFlagged || projectedHours > input.capHours ? "flagged" : "allowed";
    const statusWarning = row.warning ?? (!row.status ? `Registration status is missing for ${row.eventName}.` : undefined); const event: ClassifiedEvent = { ...row, projectedHours, classification, warning: statusWarning }; person.events.push(event); if (statusWarning) person.warnings.push(statusWarning); if (!person.email) person.warnings.push(`Missing email for ${person.name}.`); person.warnings = [...new Set(person.warnings)]; current.set(row.volunteerKey, person);
  }
  const volunteers = [...current.values()].sort((a, b) => b.currentValidatedHours - a.currentValidatedHours); const flaggedOptionalEvents = volunteers.reduce((count, person) => count + person.events.filter((event) => event.classification === "flagged").length, 0); const mandatoryExemptEvents = volunteers.reduce((count, person) => count + person.events.filter((event) => event.classification === "mandatory_exempt").length, 0); const warnings = volunteers.reduce((count, person) => count + person.warnings.length, 0);
  return { volunteers, summary: { volunteers: volunteers.length, flaggedOptionalEvents, mandatoryExemptEvents, warnings } };
}
