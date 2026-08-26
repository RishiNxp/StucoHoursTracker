import { expect, it } from "vitest";
import { buildVolunteerDraft } from "../../src/analysis";

it("uses the selected school year and cap", () => {
  const draft = buildVolunteerDraft({
    name: "Jordan", currentHours: 29, projectedHours: 31, eventName: "Food Drive",
    eventDate: new Date("2027-09-12T12:00:00.000Z"), schoolYearLabel: "2027–2028", capHours: 30,
  } as Parameters<typeof buildVolunteerDraft>[0]);
  expect(draft.body).toContain("2027–2028 school year");
  expect(draft.body).toContain("30-hour limit");
  expect(draft.body).not.toContain("25-hour limit");
});
