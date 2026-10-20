import { bookingRules } from "@/config/facility";
import { getCourt } from "@/config/courts";
import type { BookingSummary } from "./submit";
import { calculateFee } from "./pricing";
import { isValidDateString, toHHMM, toMinutes } from "./time";
import { isValidReference, normalizeReference } from "./validation";

/**
 * Encodes the non-personal part of a booking in URL parameters, so the
 * confirmation and receipt pages survive a reload, a discarded mobile tab
 * or an app update - without storing anything on the device. Name, mobile
 * and email are never put in the URL. The fee is recomputed from config.
 */

export function bookingToParams(b: BookingSummary): URLSearchParams {
  return new URLSearchParams({
    ref: b.reference,
    court: b.court.id,
    date: b.date,
    start: toHHMM(b.start),
    dur: String(b.duration),
  });
}

export function bookingFromParams(params: URLSearchParams): BookingSummary | null {
  const reference = normalizeReference(params.get("ref") ?? "");
  const court = getCourt(params.get("court"));
  const date = params.get("date");
  const start = params.get("start") ?? "";
  const duration = Number(params.get("dur"));
  if (!isValidReference(reference) || !court || !isValidDateString(date) || !/^\d{2}:\d{2}$/.test(start)) return null;
  if (!bookingRules.durationOptions.includes(duration)) return null;
  const startMin = toMinutes(start);
  return { reference, court, date, start: startMin, duration, fee: calculateFee(court, date, startMin, duration) };
}
