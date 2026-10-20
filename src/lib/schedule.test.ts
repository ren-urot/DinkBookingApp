import { describe, expect, it } from "vitest";
import { getCourt } from "@/config/courts";
import { durationProblem, getBookableDates, getCourtHours, getStartSlots, isSelectionValid } from "./schedule";

const indoor = getCourt("court-1")!; // Thu: 6:00 AM - 10:00 PM
const outdoor = getCourt("court-3")!; // 6:00 AM - 9:00 PM every day
const now = { date: "2026-10-20", minutes: 9 * 60 + 20 }; // Tue 9:20 AM
const THU = "2026-10-22";

describe("getCourtHours", () => {
  it("uses court-specific hours when set", () => {
    expect(getCourtHours(indoor, THU)).toEqual({ open: 360, close: 1320 });
    expect(getCourtHours(outdoor, THU)).toEqual({ open: 360, close: 1260 });
  });

  it("is closed on facility closed dates", () => {
    expect(getCourtHours(indoor, "2026-12-25")).toBeNull();
  });
});

describe("getStartSlots", () => {
  it("blocks slots inside the 60-minute lead time today", () => {
    const slots = getStartSlots(indoor, now.date, [], now);
    expect(slots.find((s) => s.start === 10 * 60)?.state).toBe("past"); // 40 min away
    expect(slots.find((s) => s.start === 10 * 60 + 30)?.state).toBe("available");
  });

  it("blocks the last slot when the minimum duration would run past closing", () => {
    const slots = getStartSlots(indoor, THU, [], now);
    expect(slots[slots.length - 1]).toMatchObject({ start: 21 * 60 + 30, state: "too_late" });
    expect(slots.find((s) => s.start === 21 * 60)?.state).toBe("available");
  });

  it("marks reserved times from a shared schedule as booked", () => {
    const booked = [{ start: 14 * 60, end: 16 * 60 }];
    const slots = getStartSlots(indoor, THU, booked, now);
    expect(slots.find((s) => s.start === 14 * 60 + 30)?.state).toBe("booked");
    expect(slots.find((s) => s.start === 13 * 60 + 30)?.state).toBe("too_late"); // 1 hr would overlap
    expect(slots.find((s) => s.start === 16 * 60)?.state).toBe("available");
  });

  it("flags weekday evening slots as peak", () => {
    const slots = getStartSlots(indoor, THU, [], now);
    expect(slots.find((s) => s.start === 16 * 60 + 30)?.peak).toBe(false);
    expect(slots.find((s) => s.start === 17 * 60)?.peak).toBe(true);
  });
});

describe("durationProblem / isSelectionValid", () => {
  it("rejects durations past closing", () => {
    expect(durationProblem(outdoor, THU, 19 * 60 + 30, 90)).toBeNull();
    expect(durationProblem(outdoor, THU, 19 * 60 + 30, 120)).toBe("closes");
  });

  it("validates a full selection", () => {
    expect(isSelectionValid(indoor, THU, 18 * 60, 120, [], now)).toBe(true);
    expect(isSelectionValid(indoor, THU, 18 * 60 + 15, 120, [], now)).toBe(false); // off-grid start
    expect(isSelectionValid(indoor, THU, 18 * 60, 45, [], now)).toBe(false); // not an offered duration
    expect(isSelectionValid(indoor, "2026-10-19", 18 * 60, 60, [], now)).toBe(false); // yesterday
    expect(isSelectionValid(indoor, "2026-12-25", 18 * 60, 60, [], { date: "2026-12-20", minutes: 0 })).toBe(false); // closed
  });

  it("only offers dates inside the 30-day window", () => {
    const dates = getBookableDates(now);
    expect(dates).toHaveLength(30);
    expect(dates[0]).toBe(now.date);
    expect(dates[dates.length - 1]).toBe("2026-11-18");
  });
});
