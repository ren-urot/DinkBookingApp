import { services, type SubmissionProvider } from "@/config/services";
import type { PaymentMethod } from "@/config/payment";
import { paymentMethodLabel } from "@/config/payment";
import type { Court } from "@/config/courts";
import { facility } from "@/config/facility";
import type { FeeBreakdown } from "./pricing";
import { formatPeso } from "./pricing";
import { facilityTimestamp, formatDate, formatDuration, formatTimeRange, toHHMM } from "./time";

/**
 * Adapters for the external booking service. The app only reports success
 * after the service acknowledges the request with a successful response.
 */

export type SubmissionErrorKind = "not_configured" | "offline" | "timeout" | "network" | "rejected";

export class SubmissionError extends Error {
  constructor(
    public kind: SubmissionErrorKind,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "SubmissionError";
  }
}

export interface BookingRequest {
  reference: string;
  court: Court;
  date: string;
  start: number;
  duration: number;
  fee: FeeBreakdown;
  fullName: string;
  /** Normalised +63 mobile number. */
  mobile: string;
  email: string;
  players: string;
  specialRequests: string;
  submittedAt: string;
}

/**
 * The non-personal part of a booking. Safe to carry in the URL so the
 * confirmation and receipt pages survive a reload or a discarded tab.
 */
export type BookingSummary = Pick<BookingRequest, "reference" | "court" | "date" | "start" | "duration" | "fee"> &
  Partial<Pick<BookingRequest, "fullName" | "mobile" | "email">>;

export interface ReceiptSubmission {
  reference: string;
  method: PaymentMethod;
  transactionReference: string;
  amountPaid: number;
  /** The booking this receipt is for, when known on this device. */
  booking: BookingSummary | null;
  mobile: string;
  file: File;
  submittedAt: string;
}

type Fields = Record<string, string>;

function bookingFields(b: BookingRequest): Fields {
  return {
    booking_reference: b.reference,
    status: "Request Submitted / Awaiting Payment",
    court: b.court.name,
    court_id: b.court.id,
    court_type: b.court.type,
    date: b.date,
    date_display: formatDate(b.date, "long"),
    start_time: toHHMM(b.start),
    end_time: toHHMM(b.start + b.duration),
    time_display: formatTimeRange(b.start, b.duration),
    duration_minutes: String(b.duration),
    duration_display: formatDuration(b.duration),
    estimated_total_php: String(b.fee.total),
    fee_breakdown: [
      b.fee.standardMinutes ? `${formatDuration(b.fee.standardMinutes)} standard = ${formatPeso(b.fee.standardAmount)}` : "",
      b.fee.peakMinutes ? `${formatDuration(b.fee.peakMinutes)} peak = ${formatPeso(b.fee.peakAmount)}` : "",
    ]
      .filter(Boolean)
      .join("; "),
    full_name: b.fullName,
    mobile: b.mobile,
    email: b.email || "(not provided)",
    players: b.players || "(not provided)",
    special_requests: b.specialRequests || "(none)",
    submitted_at: b.submittedAt,
    staff_note:
      "Availability is NOT guaranteed by the website. Check the schedule for conflicts and verify payment before confirming.",
  };
}

function receiptFields(r: ReceiptSubmission): Fields {
  const b = r.booking;
  const unknown = `(see booking request ${r.reference})`;
  return {
    booking_reference: r.reference,
    status: "Payment Submitted - needs verification",
    payment_method: paymentMethodLabel[r.method],
    transaction_reference: r.transactionReference,
    amount_paid_php: String(r.amountPaid),
    expected_amount_php: b ? String(b.fee.total) : unknown,
    amount_matches: !b ? "unknown" : b.fee.total === r.amountPaid ? "yes" : "NO - check before confirming",
    court: b ? b.court.name : unknown,
    date_display: b ? formatDate(b.date, "long") : unknown,
    time_display: b ? formatTimeRange(b.start, b.duration) : unknown,
    full_name: b?.fullName || "(not provided)",
    mobile: r.mobile || "(not provided)",
    submitted_at: r.submittedAt,
    staff_note: "An uploaded receipt is NOT proof of payment. Verify against GCash/bank records.",
  };
}

async function postWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new SubmissionError("offline", "You appear to be offline. Check your connection and try again.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, method: "POST", signal: controller.signal, credentials: "omit" });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new SubmissionError(
        "timeout",
        "The booking service took too long to respond. Your request may not have been received.",
      );
    }
    throw new SubmissionError("network", "We couldn't reach the booking service. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.clone().json();
    if (Array.isArray(data?.errors) && data.errors.length) return data.errors.map((e: { message?: string }) => e.message).join(" ");
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.message === "string") return data.message;
  } catch {
    /* not JSON */
  }
  return `The booking service returned an error (HTTP ${res.status}).`;
}

const NOT_ACKNOWLEDGED =
  "The booking service didn't confirm that it received your submission, so it may not have been saved.";

/**
 * Confirms the service really accepted the submission. A bare 2xx is not
 * enough: a missing function or unregistered form can fall through to the
 * app's own index.html with status 200, which must never count as success.
 */
export async function ensureAcknowledged(res: Response, provider: SubmissionProvider): Promise<void> {
  if (!res.ok) throw new SubmissionError("rejected", await readError(res), res.status);
  const type = res.headers.get("content-type") ?? "";

  if (provider === "netlify") {
    const body = await res.text().catch(() => "");
    // Netlify replies with its own HTML; our SPA shell means the form wasn't handled.
    if (body.includes('<div id="root">')) throw new SubmissionError("rejected", NOT_ACKNOWLEDGED, res.status);
    return;
  }

  // Formspree replies { ok: true }; webhooks must reply { ok: true } or { success: true }.
  const data = type.includes("application/json") ? await res.json().catch(() => null) : null;
  if (data && (data.ok === true || data.success === true)) return;
  const reason = data && (data.error || data.message);
  throw new SubmissionError("rejected", typeof reason === "string" && reason ? reason : NOT_ACKNOWLEDGED, res.status);
}

async function send(
  kind: "booking" | "receipt",
  fields: Fields,
  file?: File,
): Promise<void> {
  const provider = services.provider;
  const endpoint = kind === "booking" ? services.bookingEndpoint : services.receiptEndpoint;
  const timeout = kind === "booking" ? services.requestTimeoutMs : services.receiptTimeoutMs;

  if (!provider || (!endpoint && provider !== "demo")) {
    throw new SubmissionError(
      "not_configured",
      `Online ${kind === "booking" ? "booking" : "receipt submission"} is not available right now. Please contact ${facility.name} directly.`,
    );
  }

  if (provider === "demo") {
    // Local development only (see services.ts). Nothing leaves the browser.
    await new Promise((r) => setTimeout(r, 900));
    console.info(`[demo] ${kind} submission (NOT sent)`, fields, file);
    return;
  }

  const subject =
    kind === "booking"
      ? `New booking request ${fields.booking_reference} - ${fields.court}, ${fields.date_display} ${fields.time_display}`
      : `Payment receipt for ${fields.booking_reference} - ${fields.payment_method} ${formatPeso(Number(fields.amount_paid_php))}`;

  if (provider === "netlify") {
    const form = new FormData();
    form.append("form-name", kind === "booking" ? services.netlifyForms.booking : services.netlifyForms.receipt);
    form.append("subject", subject);
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    if (file) form.append("receipt", file, file.name);
    // Booking requests have no file, so send them URL-encoded as Netlify expects.
    const body = file ? form : new URLSearchParams(form as unknown as Record<string, string>).toString();
    const headers: HeadersInit = file ? {} : { "Content-Type": "application/x-www-form-urlencoded" };
    const res = await postWithTimeout(endpoint!, { body, headers }, timeout);
    await ensureAcknowledged(res, provider);
    return;
  }

  // formspree + webhook
  const extra: Fields = provider === "formspree" ? { _subject: subject } : { subject, submission_type: kind };
  if (provider === "formspree" && fields.email && fields.email.includes("@")) extra._replyto = fields.email;

  let res: Response;
  if (file) {
    const form = new FormData();
    Object.entries({ ...fields, ...extra }).forEach(([k, v]) => form.append(k, v));
    form.append("receipt", file, file.name);
    res = await postWithTimeout(endpoint!, { body: form, headers: { Accept: "application/json" } }, timeout);
  } else {
    res = await postWithTimeout(
      endpoint!,
      {
        body: JSON.stringify({ ...fields, ...extra }),
        headers: { "Content-Type": "application/json", Accept: "application/json" },
      },
      timeout,
    );
  }
  await ensureAcknowledged(res, provider);
}

// Guards against double taps / repeated submits for the same reference.
const inFlight = new Map<string, Promise<void>>();
const acknowledged = new Set<string>();

function once(key: string, run: () => Promise<void>): Promise<void> {
  if (acknowledged.has(key)) return Promise.resolve();
  const pending = inFlight.get(key);
  if (pending) return pending;
  const p = run()
    .then(() => {
      acknowledged.add(key);
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

export function submitBookingRequest(b: BookingRequest): Promise<void> {
  return once(`booking:${b.reference}`, () => send("booking", bookingFields(b)));
}

export function submitPaymentReceipt(r: ReceiptSubmission): Promise<void> {
  return once(`receipt:${r.reference}:${r.transactionReference}`, () => send("receipt", receiptFields(r), r.file));
}

export function nowStamp(): string {
  return facilityTimestamp();
}
