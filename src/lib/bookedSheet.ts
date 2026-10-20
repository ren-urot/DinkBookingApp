import { courts, type Court } from "@/config/courts";
import type { BookedRange } from "./schedule";
import { isValidDateString } from "./time";

/**
 * Reads the staff's "booked slots" Google Sheet (CSV) and turns it into busy
 * time ranges. The sheet is public, so it must never contain names or phone
 * numbers - only court, date, start, end and an optional status/reference.
 *
 * Expected columns (header row, any order, case-insensitive):
 *   Court | Date | Start | End | Status (optional) | Reference (optional)
 * Rows whose Status says cancelled/released/unavailable are ignored; every other
 * row (Confirmed, Held, Paid, blank...) blocks the time.
 */

export type BookedIndex = Map<string, BookedRange[]>;

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** "C1", "court-1", "1", "Court 1" or the full court name. */
export function matchCourt(value: string): Court | undefined {
  const v = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!v) return undefined;
  return courts.find((c) => {
    const number = c.id.match(/\d+/)?.[0];
    return (
      v === c.id ||
      v === c.code.toLowerCase() ||
      v === c.name.toLowerCase() ||
      (number !== undefined && (v === number || v === `court ${number}` || v.startsWith(`court ${number} `)))
    );
  });
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "2026-10-22", "10/22/2026" (Google Sheets' default), "Oct 22, 2026" or "22 Oct 2026" -> "2026-10-22". */
export function parseSheetDate(value: string): string | null {
  const v = value.trim();
  const pad = (n: number) => String(n).padStart(2, "0");
  let y: number, m: number, d: number;
  let match = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) [m, d, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = v.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/))) [m, d, y] = [MONTHS.indexOf(match[1].toLowerCase()) + 1, Number(match[2]), Number(match[3])];
  else if ((match = v.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})$/))) [d, m, y] = [Number(match[1]), MONTHS.indexOf(match[2].toLowerCase()) + 1, Number(match[3])];
  else return null;
  const iso = `${y}-${pad(m)}-${pad(d)}`;
  return isValidDateString(iso) ? iso : null;
}

/** "18:00", "18:00:00", "6:00 PM", "6 PM", "6:00:00 PM" -> minutes after midnight. "24:00" is allowed for end times. */
export function parseSheetTime(value: string): number | null {
  const match = value.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm)?$/);
  if (!match) return null;
  let h = Number(match[1]);
  const min = Number(match[2] ?? 0);
  const suffix = match[3];
  if (min > 59) return null;
  if (suffix) {
    if (h < 1 || h > 12) return null;
    if (suffix === "am" && h === 12) h = 0;
    if (suffix === "pm" && h !== 12) h += 12;
  } else if (h > 24 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

const IGNORED_STATUS = /cancel|releas|unavailable|void|reject|declin/i;

export function buildBookedIndex(csv: string): { index: BookedIndex; skipped: number } {
  const [header = [], ...rows] = parseCsv(csv).filter((r) => r.some((cell) => cell.trim() !== ""));
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const [ci, di, si, ei, sti] = [col("court"), col("date"), col("start"), col("end"), col("status")];
  const index: BookedIndex = new Map();
  let skipped = 0;
  if (ci < 0 || di < 0 || si < 0 || ei < 0) return { index, skipped: rows.length };
  for (const r of rows) {
    if (sti >= 0 && IGNORED_STATUS.test(r[sti] ?? "")) continue;
    const court = matchCourt(r[ci] ?? "");
    const date = parseSheetDate(r[di] ?? "");
    const start = parseSheetTime(r[si] ?? "");
    let end = parseSheetTime(r[ei] ?? "");
    if (end === 0) end = 24 * 60; // "12:00 AM" end means midnight
    if (!court || !date || start == null || end == null || end <= start) {
      skipped++;
      continue;
    }
    const key = `${court.id}|${date}`;
    index.set(key, [...(index.get(key) ?? []), { start, end }]);
  }
  return { index, skipped };
}
