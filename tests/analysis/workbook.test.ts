import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseWorkbook } from "../../src/analysis/workbook";

const workbookBytes = (sheetName: string, rows: unknown[][]) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
};

describe("parseWorkbook", () => {
  it("turns the first row into exact object keys while preserving raw values", () => {
    const parsed = parseWorkbook(workbookBytes("Commitments", [["VOLUNTEER NAME", "DURATION (HRS)"], ["Jordan", 1.5]]));
    expect(parsed.sheets.Commitments).toEqual([
      { "VOLUNTEER NAME": "VOLUNTEER NAME", "DURATION (HRS)": "DURATION (HRS)" },
      { "VOLUNTEER NAME": "Jordan", "DURATION (HRS)": 1.5 },
    ]);
  });

  it("rejects malformed workbook bytes", () => {
    expect(() => parseWorkbook(new TextEncoder().encode("not a workbook").buffer)).toThrow(/workbook/i);
  });
});
