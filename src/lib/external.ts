import { services } from "@/config/services";
import { parseStatus, type BookingStatus } from "@/config/statuses";
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

export async function fetchAvailability(courtId: string, date: string, signal?: AbortSignal): Promise<AvailabilityResult> {
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
