import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

/**
 * Tests the pure helpers inside docs/admin-apps-script.gs (the Google Apps
 * Script staff paste into the sheet). The file is loaded as plain JavaScript;
 * Google-only services are never called by these helpers.
 */
const source = fs.readFileSync(path.resolve(__dirname, "../../docs/admin-apps-script.gs"), "utf8");
const ctx: Record<string, unknown> = {};
vm.createContext(ctx);
vm.runInContext(source, ctx);

type Row = { row: number; court: string; date: string; start: string; end: string; status: string; reference: string };
const fn = <T extends (...args: never[]) => unknown>(name: string) => ctx[name] as T;
const findConflict = fn<(rows: Row[], b: Partial<Row>) => Row | null>("findConflict");
const validateBooking = fn<(b: unknown) => string | null>("validateBooking");
const indexHeaders = fn<(h: string[]) => Record<string, number>>("indexHeaders");
const rowsFromValues = fn<(v: string[][], idx: Record<string, number>, first?: number) => Row[]>("rowsFromValues");
const findActiveReference = fn<(rows: Row[], ref: string) => Row | null>("findActiveReference");
const timeToMinutes = fn<(v: string) => number>("timeToMinutes");

const header = ["Court", "Date", "Start", "End", "Status", "Reference"];
const values = [
  ["C2", "2026-10-22", "18:00", "20:00", "Confirmed", "DD-261020-AAAAA"],
  ["Court 2", "10/22/2026", "8:00 PM", "9:00 PM", "Cancelled", "DD-261020-BBBBB"],
  ["", "", "", "", "", ""],
  ["C3", "2026-10-22", "21:00", "12:00 AM", "Held", ""],
];
const rows = rowsFromValues(values, indexHeaders(header));

describe("admin Apps Script helpers", () => {
  it("reads rows with sheet row numbers and skips blank rows", () => {
    expect(rows.map((r) => r.row)).toEqual([2, 3, 5]);
  });

  it("requires all headers", () => {
    expect(() => indexHeaders(["Court", "Date"])).toThrow(/headers/);
  });

  it("finds overlaps on the same court and date, ignoring cancelled rows and other courts", () => {
    const b = { court: "C2", date: "2026-10-22", start: "19:00", end: "20:00" };
    expect(findConflict(rows, b)?.reference).toBe("DD-261020-AAAAA");
    expect(findConflict(rows, { ...b, start: "20:00", end: "21:00" })).toBeNull(); // only a cancelled row there
    expect(findConflict(rows, { ...b, court: "C1" })).toBeNull();
    expect(findConflict(rows, { court: "c3", date: "2026-10-22", start: "22:00", end: "23:00" })?.row).toBe(5); // midnight end
  });

  it("validates new bookings", () => {
    const ok = { court: "C1", date: "2026-10-24", start: "18:00", end: "19:30", status: "Held", reference: "DD-261020-7KQ3P" };
    expect(validateBooking(ok)).toBeNull();
    expect(validateBooking({ ...ok, date: "10/24/2026" })).toMatch(/Date/);
    expect(validateBooking({ ...ok, end: "17:00" })).toMatch(/End time/);
    expect(validateBooking({ ...ok, status: "Cancelled" })).toMatch(/Status/);
    expect(validateBooking({ ...ok, reference: "<script>" })).toMatch(/Reference/);
  });

  it("detects a reference that is already active", () => {
    expect(findActiveReference(rows, "dd-261020-aaaaa")?.row).toBe(2);
    expect(findActiveReference(rows, "DD-261020-BBBBB")).toBeNull(); // cancelled
    expect(findActiveReference(rows, "")).toBeNull();
  });

  it("parses times the same way as the website", () => {
    expect(timeToMinutes("6:30 PM")).toBe(1110);
    expect(timeToMinutes("18:30")).toBe(1110);
    expect(timeToMinutes("12:00 AM")).toBe(0);
  });
});
