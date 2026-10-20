import { bookingRules, facility, type DayHours, type Weekday } from "@/config/facility";
import type { Court } from "@/config/courts";
import { addDays, facilityNow, toMinutes, weekdayOf } from "./time";
import { isPeakMinute } from "./pricing";

export interface BookedRange {
  start: number;
  end: number;
}

export type SlotState = "available" | "past" | "booked" | "too_late";

export interface StartSlot {
  start: number;
  state: SlotState;
  peak: boolean;
}

export function getCourtHours(court: Court, date: string): { open: number; close: number } | null {
  if (facility.closedDates.includes(date)) return null;
  const day = weekdayOf(date);
  const hours: DayHours | null | undefined =
    court.hours && day in court.hours ? court.hours[day] : facility.hours[day];
  if (!hours) return null;
  return { open: toMinutes(hours.open), close: toMinutes(hours.close) };
}

export function getHoursForDay(court: Court | undefined, day: Weekday): DayHours | null {
  if (court?.hours && day in court.hours) return court.hours[day] ?? null;
  return facility.hours[day];
}

/** Dates customers may pick, from today through the advance-booking window. */
export function getBookableDates(now = facilityNow()): string[] {
  return Array.from({ length: bookingRules.advanceBookingDays }, (_, i) => addDays(now.date, i));
}

export function isDateInWindow(date: string, now = facilityNow()): boolean {
  return getBookableDates(now).includes(date);
}

function overlaps(start: number, end: number, booked: BookedRange[]): boolean {
  return booked.some((b) => start < b.end && end > b.start);
}

/** Earliest minute of `date` that can still be requested, honouring the minimum lead time. */
function earliestStart(date: string, now: { date: string; minutes: number }): number {
  if (date < now.date) return Infinity;
  if (date > now.date) return -Infinity;
  return now.minutes + bookingRules.minLeadMinutes;
}

export function getStartSlots(
  court: Court,
  date: string,
  booked: BookedRange[] = [],
  now = facilityNow(),
): StartSlot[] {
  const hours = getCourtHours(court, date);
  if (!hours) return [];
  const minDuration = Math.min(...bookingRules.durationOptions);
  const earliest = earliestStart(date, now);
  const day = weekdayOf(date);
  const slots: StartSlot[] = [];
  for (let t = hours.open; t + bookingRules.slotIntervalMinutes <= hours.close; t += bookingRules.slotIntervalMinutes) {
    let state: SlotState = "available";
    if (t < earliest) state = "past";
    else if (overlaps(t, t + bookingRules.slotIntervalMinutes, booked)) state = "booked";
    else if (t + minDuration > hours.close || overlaps(t, t + minDuration, booked)) state = "too_late";
    slots.push({ start: t, state, peak: isPeakMinute(day, t) });
  }
  return slots;
}

/** Why a duration cannot be used from a given start, or null when it fits. */
export function durationProblem(
  court: Court,
  date: string,
  start: number,
  duration: number,
  booked: BookedRange[] = [],
): "closes" | "booked" | null {
  const hours = getCourtHours(court, date);
  if (!hours || start + duration > hours.close) return "closes";
  if (overlaps(start, start + duration, booked)) return "booked";
  return null;
}

/** Full validation of a selection, used before submitting. */
export function isSelectionValid(
  court: Court,
  date: string,
  start: number,
  duration: number,
  booked: BookedRange[] = [],
  now = facilityNow(),
): boolean {
  if (!isDateInWindow(date, now)) return false;
  if (!bookingRules.durationOptions.includes(duration)) return false;
  const hours = getCourtHours(court, date);
  if (!hours) return false;
  if (start < hours.open || (start - hours.open) % bookingRules.slotIntervalMinutes !== 0) return false;
  if (start < earliestStart(date, now)) return false;
  return durationProblem(court, date, start, duration, booked) === null;
}
