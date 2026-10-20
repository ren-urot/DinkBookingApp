import { facility, type Weekday } from "@/config/facility";
import { peakWindows, type Court } from "@/config/courts";
import { toMinutes, weekdayOf } from "./time";

/** Bookings are billed in blocks of this many minutes. */
const BLOCK_MINUTES = 30;

export function isPeakMinute(day: Weekday, minute: number): boolean {
  return peakWindows.some(
    (w) => w.days.includes(day) && minute >= toMinutes(w.start) && minute < toMinutes(w.end),
  );
}

export interface FeeBreakdown {
  standardMinutes: number;
  peakMinutes: number;
  standardAmount: number;
  peakAmount: number;
  total: number;
}

export function calculateFee(court: Court, date: string, start: number, duration: number): FeeBreakdown {
  const day = weekdayOf(date);
  let standardMinutes = 0;
  let peakMinutes = 0;
  for (let t = start; t < start + duration; t += BLOCK_MINUTES) {
    const block = Math.min(BLOCK_MINUTES, start + duration - t);
    if (isPeakMinute(day, t)) peakMinutes += block;
    else standardMinutes += block;
  }
  const standardAmount = Math.round((court.rate * standardMinutes) / 60);
  const peakAmount = Math.round((court.peakRate * peakMinutes) / 60);
  return { standardMinutes, peakMinutes, standardAmount, peakAmount, total: standardAmount + peakAmount };
}

const currencyFormatter = new Intl.NumberFormat(facility.locale, {
  style: "currency",
  currency: facility.currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPeso(amount: number): string {
  return currencyFormatter.format(amount);
}
