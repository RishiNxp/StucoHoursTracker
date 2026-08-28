import * as XLSX from "xlsx";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const outputDirectory = dirname(fileURLToPath(import.meta.url));
const writeWorkbook = async (filename, sheetName, rows) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  await writeFile(`${outputDirectory}/${filename}`, XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
};

await mkdir(outputDirectory, { recursive: true });
await writeWorkbook("team-metrics-browser-team-report.xlsx", "Commitments", [
  ["VOLUNTEER NAME", "DURATION (HRS)", "ATTENDANCE", "DATE AND TIME", "OPPORTUNITY", "VOLUNTEER EMAIL", "OPP ID"],
  ["Alice Active", 2, "Validated", "2026-08-02T12:00:00.000Z", "Kickoff", "alice@example.com", "kickoff"],
  ["Bob Busy", 4, "Validated", "2026-08-17T12:00:00.000Z", "Food Drive", "bob@example.com", "food-drive"],
  ["Alice Active", 3, "Validated", "2026-09-14T12:00:00.000Z", "Fall Festival", "alice@example.com", "fall-festival"],
]);
await writeWorkbook("team-metrics-browser-upcoming-report.xlsx", "Opportunity Volunteers", [
  ["OPPORTUNITY", "DATE AND TIME", "DURATION", "EMAIL ADDRESS", "TEAMS"],
]);
await writeWorkbook("team-metrics-browser-roster.xlsx", "Full Roster", [
  ["Student Name", "Email"],
  ["Alice Active", "alice@example.com"],
  ["Bob Busy", "bob@example.com"],
  ["Cara Zero", "cara@example.com"],
]);
