import { describe, expect, it } from "vitest";
import { toSheetCsvUrl } from "@/config/services";
import { buildBookedIndex, matchCourt, parseCsv, parseSheetDate, parseSheetTime, sheetStatusToBookingStatus } from "./bookedSheet";

describe("toSheetCsvUrl", () => {
  const id = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";

  it("turns a normal share link into the CSV link", () => {
    expect(toSheetCsvUrl(`https://docs.google.com/spreadsheets/d/${id}/edit?usp=sharing`)).toBe(
      `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`,
    );
  });

  it("keeps the tab when the link has a gid", () => {
    expect(toSheetCsvUrl(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=123`)).toBe(
      `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=123`,
    );
  });

  it("leaves ready-made CSV links alone and ignores blanks", () => {
    const csv = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
    expect(toSheetCsvUrl(csv)).toBe(csv);
    expect(toSheetCsvUrl("")).toBeNull();
    expect(toSheetCsvUrl(undefined)).toBeNull();
  });
});

describe("cell parsing", () => {
  it("parses quoted CSV", () => {
    expect(parseCsv('"Court","Note"\r\n"C1","a, ""b"""\nC2,x')).toEqual([
      ["Court", "Note"],
      ["C1", 'a, "b"'],
      ["C2", "x"],
    ]);
  });

  it.each([
    ["C1", "court-1"],
    ["c3", "court-3"],
    ["court-2", "court-2"],
    ["2", "court-2"],
    ["Court 4", "court-4"],
    ["Court 1 - Center Court", "court-1"],
  ])("matches court %s", (input, id) => {
    expect(matchCourt(input)?.id).toBe(id);
  });

  it("does not match unknown courts", () => {
    expect(matchCourt("C9")).toBeUndefined();
    expect(matchCourt("")).toBeUndefined();
    expect(matchCourt("Court 10")).toBeUndefined();
  });

  it.each([
    ["2026-10-22", "2026-10-22"],
    ["10/22/2026", "2026-10-22"],
    ["Oct 22, 2026", "2026-10-22"],
    ["22 October 2026", "2026-10-22"],
    ["2026-02-30", null],
    ["tomorrow", null],
  ])("parses date %s", (input, iso) => {
    expect(parseSheetDate(input)).toBe(iso);
  });

  it.each([
    ["18:00", 1080],
    ["18:00:00", 1080],
    ["6:00 PM", 1080],
    ["6 pm", 1080],
    ["12:00 AM", 0],
    ["12:30 PM", 750],
    ["24:00", 1440],
    ["25:00", null],
    ["13:00 PM", null],
  ])("parses time %s", (input, minutes) => {
    expect(parseSheetTime(input)).toBe(minutes);
  });
});

describe("buildBookedIndex", () => {
  it("blocks confirmed and held rows, skips cancelled ones and bad rows", () => {
    const csv = [
      '"Court","Date","Start","End","Status","Reference"',
      '"C1","2026-10-22","6:00 PM","8:00 PM","Confirmed","DD-261020-7KQ3P"',
      '"C1","10/22/2026","20:00","21:00","Held",""',
      '"C2","2026-10-22","18:00","19:00","Cancelled",""',
      '"C3","2026-10-22","9:00 PM","12:00 AM","",""',
      '"C9","2026-10-22","18:00","19:00","",""',
      '"C1","2026-10-22","19:00","18:00","",""',
      '"","","","","",""',
    ].join("\n");
    const { index, skipped } = buildBookedIndex(csv);
    expect(index.get("court-1|2026-10-22")).toEqual([
      { start: 1080, end: 1200 },
      { start: 1200, end: 1260 },
    ]);
    expect(index.has("court-2|2026-10-22")).toBe(false);
    expect(index.get("court-3|2026-10-22")).toEqual([{ start: 1260, end: 1440 }]);
    expect(skipped).toBe(2); // unknown court C9, end before start
  });

  it("indexes statuses by booking reference for customers", () => {
    const csv = [
      "Court,Date,Start,End,Status,Reference",
      "C1,2026-10-22,18:00,20:00,Confirmed,dd-261020-aaaaa",
      "C2,2026-10-22,18:00,19:00,Held,DD-261020-BBBBB",
      "C2,2026-10-23,18:00,19:00,Cancelled,DD-261020-BBBBB",
      "C3,2026-10-22,07:00,08:00,Cancelled,DD-261020-CCCCC",
    ].join("\n");
    const { byReference } = buildBookedIndex(csv);
    expect(byReference.get("DD-261020-AAAAA")).toMatchObject({ status: "confirmed", date: "2026-10-22", start: 1080, end: 1200 });
    expect(byReference.get("DD-261020-AAAAA")?.court?.id).toBe("court-1");
    // a later cancelled row doesn't hide the active one
    expect(byReference.get("DD-261020-BBBBB")).toMatchObject({ status: "awaiting_payment", date: "2026-10-22" });
    expect(byReference.get("DD-261020-CCCCC")?.status).toBe("cancelled");
  });

  it.each([
    ["Confirmed", "confirmed"],
    ["Held", "awaiting_payment"],
    ["", "awaiting_payment"],
    ["Under verification", "under_verification"],
    ["Cancelled", "cancelled"],
    ["Unavailable", "unavailable"],
  ])("maps sheet status %s", (raw, status) => {
    expect(sheetStatusToBookingStatus(raw)).toBe(status);
  });

  it("ignores the whole sheet when required columns are missing", () => {
    const { index, skipped } = buildBookedIndex("Court,Day,From,To\nC1,2026-10-22,18:00,19:00");
    expect(index.size).toBe(0);
    expect(skipped).toBe(1);
  });
});
