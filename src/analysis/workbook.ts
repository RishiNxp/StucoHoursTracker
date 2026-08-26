import * as XLSX from "xlsx";
import type { WorkbookLike } from "./types";

export function parseWorkbook(bytes: ArrayBuffer): WorkbookLike {
  const signature = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 4));
  if (signature.length < 4 || signature[0] !== 0x50 || signature[1] !== 0x4b) {
    throw new Error("The uploaded file is not a valid .xlsx workbook.");
  }
  try {
    const workbook = XLSX.read(bytes, { type: "array", cellDates: false });
    const sheets: WorkbookLike["sheets"] = {};
    for (const name of workbook.SheetNames) {
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, raw: true, defval: null });
      const headers = (matrix[0] ?? []).map((value) => String(value ?? "").trim());
      sheets[name] = matrix.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? null])));
    }
    return { sheets };
  } catch {
    throw new Error("The uploaded file could not be read as an .xlsx workbook.");
  }
}
