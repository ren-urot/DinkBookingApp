import { services } from "@/config/services";
import { parseStatus, type BookingStatus } from "@/config/statuses";
import { buildBookedIndex, type BookedIndex, type SheetBooking } from "./bookedSheet";
import type { BookedRange } from "./schedule";
import { toMinutes } from "./time";

/**
 * Optional integrations. Both are disabled unless an endpoint is configured,
 * and the app falls back to manual staff checks / contact channels.
 */

export type AvailabilityResult =
  | { status: "disabled" }
  | { status: "ok"; booked: BookedRange[] }
  | { status: "error" };

const AVAILABILITY_TIMEOUT_MS = 8_000;
/** How long one download of the booked-slots sheet is reused before re-checking. */
const SHEET_CACHE_MS = 60_000;

type LoadedSheet = { index: BookedIndex; byReference: Map<string, SheetBooking> };
let sheetCache: { at: number; sheet: Promise<LoadedSheet> } | null = null;

function loadBookedSheet(url: string): Promise<LoadedSheet> {
  if (sheetCache && Date.now() - sheetCache.at < SHEET_CACHE_MS) return sheetCache.sheet;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AVAILABILITY_TIMEOUT_MS);
  const sheet = fetch(url, { signal: controller.signal, credentials: "omit", cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Booked-slots sheet returned HTTP ${res.status}`);
      const text = await res.text();
      // A private sheet answers with Google's sign-in page instead of CSV.
      if (/^\s*</.test(text)) throw new Error("Booked-slots sheet is not shared publicly");
      const { index, byReference, skipped } = buildBookedIndex(text);
      if (skipped) console.warn(`[availability] Ignored ${skipped} sheet row(s) with a missing or unreadable court, date or time.`);
      return { index, byReference };
    })
    .finally(() => clearTimeout(timer));
  sheetCache = { at: Date.now(), sheet };
  sheet.catch(() => {
    sheetCache = null; // retry on the next request instead of caching the failure
  });
  return sheet;
}

/** Forget the cached sheet, e.g. right after an admin edit, so the next read is fresh. */
export function clearBookedSheetCache() {
  sheetCache = null;
}

export type SheetStatusResult = { kind: "found"; booking: SheetBooking } | { kind: "not_found" } | { kind: "disabled" } | { kind: "error" };

export const isSheetStatusEnabled = () => Boolean(services.bookedSheetUrl);

/** Looks up a booking reference in the facility's sheet. The sheet holds no personal data. */
export async function fetchSheetStatus(reference: string): Promise<SheetStatusResult> {
  if (!services.bookedSheetUrl) return { kind: "disabled" };
  try {
    const { byReference } = await loadBookedSheet(services.bookedSheetUrl);
    const booking = byReference.get(reference.trim().toUpperCase());
    return booking ? { kind: "found", booking } : { kind: "not_found" };
  } catch (err) {
    console.error("[status]", err);
    return { kind: "error" };
  }
}

export async function fetchAvailability(courtId: string, date: string, signal?: AbortSignal): Promise<AvailabilityResult> {
  if (services.bookedSheetUrl) {
    try {
      const { index } = await loadBookedSheet(services.bookedSheetUrl);
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      return { status: "ok", booked: index.get(`${courtId}|${date}`) ?? [] };
    } catch (err) {
      if (signal?.aborted) throw err;
      console.error("[availability]", err);
      return { status: "error" };
    }
  }
  if (!services.availabilityEndpoint) return { status: "disabled" };
  // Abort on the caller's signal (date changed) or after a timeout (service hung).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AVAILABILITY_TIMEOUT_MS);
  signal?.addEventListener("abort", () => controller.abort());
  try {
    const url = new URL(services.availabilityEndpoint, window.location.origin);
    url.searchParams.set("court", courtId);
    url.searchParams.set("date", date);
    const res = await fetch(url, { signal: controller.signal, credentials: "omit", headers: { Accept: "application/json" } });
    if (!res.ok) return { status: "error" };
    const data = await res.json();
    if (!Array.isArray(data?.booked)) return { status: "error" };
    const booked: BookedRange[] = data.booked
      .filter((b: unknown): b is { start: string; end: string } =>
        typeof (b as { start?: unknown })?.start === "string" && typeof (b as { end?: unknown })?.end === "string",
      )
      .map((b: { start: string; end: string }) => ({ start: toMinutes(b.start), end: toMinutes(b.end) }))
      .filter((b: BookedRange) => Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start);
    return { status: "ok", booked };
  } catch (err) {
    if (signal?.aborted) throw err;
    return { status: "error" };
  } finally {
    clearTimeout(timer);
  }
}

export interface LookupResult {
  status: BookingStatus;
  court?: string;
  date?: string;
  time?: string;
  updatedAt?: string;
  note?: string;
}

export type LookupResponse =
  | { kind: "found"; booking: LookupResult }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

export const isLookupEnabled = () => Boolean(services.lookupEndpoint);

export async function lookupBooking(reference: string, mobile: string): Promise<LookupResponse> {
  if (!services.lookupEndpoint) return { kind: "error", message: "Online booking lookup is not available." };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), services.requestTimeoutMs);
  try {
    const res = await fetch(services.lookupEndpoint, {
      method: "POST",
      credentials: "omit",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ reference, mobile }),
    });
    // 404 and 401/403 look identical to the customer, so nothing is revealed about
    // whether a reference exists with a different mobile number.
    if (res.status === 404 || res.status === 401 || res.status === 403) return { kind: "not_found" };
    if (!res.ok) return { kind: "error", message: `The lookup service returned an error (HTTP ${res.status}).` };
    const data = await res.json();
    const status = parseStatus(data?.status);
    if (!status) return { kind: "error", message: "The lookup service returned an unexpected response." };
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    return {
      kind: "found",
      booking: {
        status,
        court: str(data.court),
        date: str(data.date),
        time: str(data.time) ?? (str(data.startTime) && str(data.duration) ? `${data.startTime} (${data.duration})` : str(data.startTime)),
        updatedAt: str(data.updatedAt),
        note: str(data.note),
      },
    };
  } catch (err) {
    if ((err as Error).name === "AbortError") return { kind: "error", message: "The lookup service took too long to respond." };
    return { kind: "error", message: "We couldn't reach the lookup service. Check your connection and try again." };
  } finally {
    clearTimeout(timer);
  }
}
