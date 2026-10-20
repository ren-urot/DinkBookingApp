import { describe, expect, it } from "vitest";
import { addDays, facilityNow, formatDuration, formatTime, formatTimeRange, isValidDateString, weekdayOf } from "./time";

describe("facilityNow", () => {
  it("uses Manila time, not UTC, across the day boundary", () => {
    // 16:30 UTC on Oct 19 is 00:30 on Oct 20 in Manila (UTC+8).
    expect(facilityNow(new Date("2026-10-19T16:30:00Z"))).toEqual({ date: "2026-10-20", minutes: 30 });
  });

  it("reports midnight as minute 0", () => {
    expect(facilityNow(new Date("2026-10-19T16:00:00Z")).minutes).toBe(0);
  });
});

describe("date helpers", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("finds the weekday of a date string", () => {
    expect(weekdayOf("2026-10-22")).toBe(4); // Thursday
    expect(weekdayOf("2026-10-25")).toBe(0); // Sunday
  });

  it("validates real calendar dates only", () => {
    expect(isValidDateString("2026-10-20")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("20-10-2026")).toBe(false);
    expect(isValidDateString(null)).toBe(false);
  });
});

describe("formatting", () => {
  it("formats 12-hour times including noon and midnight", () => {
    expect(formatTime(0)).toBe("12:00 AM");
    expect(formatTime(12 * 60)).toBe("12:00 PM");
    expect(formatTime(18 * 60 + 30)).toBe("6:30 PM");
    expect(formatTime(24 * 60)).toBe("12:00 AM");
  });

  it("formats ranges and durations", () => {
    expect(formatTimeRange(18 * 60, 120)).toBe("6:00 PM - 8:00 PM");
    expect(formatDuration(60)).toBe("1 hour");
    expect(formatDuration(90)).toBe("1 hr 30 min");
    expect(formatDuration(120)).toBe("2 hours");
  });
});
