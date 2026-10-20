import { describe, expect, it } from "vitest";
import { getCourt } from "@/config/courts";
import { calculateFee } from "./pricing";

const court1 = getCourt("court-1")!; // ₱500 standard, ₱650 peak

describe("calculateFee", () => {
  it("charges the standard rate on a weekday morning", () => {
    // Thursday 9:00-11:00
    expect(calculateFee(court1, "2026-10-22", 9 * 60, 120)).toMatchObject({ standardMinutes: 120, peakMinutes: 0, total: 1000 });
  });

  it("splits a weekday booking across the 5 PM peak boundary", () => {
    // Thursday 4:30-6:30 PM: 30 min standard + 90 min peak
    expect(calculateFee(court1, "2026-10-22", 16 * 60 + 30, 120)).toEqual({
      standardMinutes: 30,
      peakMinutes: 90,
      standardAmount: 250,
      peakAmount: 975,
      total: 1225,
    });
  });

  it("charges peak all day on weekends", () => {
    // Saturday 8:00-9:30 AM
    expect(calculateFee(court1, "2026-10-24", 8 * 60, 90)).toMatchObject({ standardMinutes: 0, peakMinutes: 90, total: 975 });
  });
});
