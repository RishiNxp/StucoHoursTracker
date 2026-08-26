export type DraftInput = { name: string; currentHours: number; projectedHours: number; eventName: string; eventDate: Date };
export type Draft = { subject: string; body: string; copyText: string };

export function buildVolunteerDraft(input: DraftInput): Draft {
  const date = input.eventDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const subject = `Volunteer opportunity update for ${input.name}`;
  const body = `Hi ${input.name},\n\nYou currently have ${input.currentHours} validated volunteer hours for the 2026–2027 school year. The ${input.eventName} on ${date} would bring your projected total to ${input.projectedHours} hours. Because this is above our 25-hour limit, we need to remove you from this optional opportunity so more students have a chance to participate.\n\nThank you for understanding!`;
  return { subject, body, copyText: `${subject}\n\n${body}` };
}
