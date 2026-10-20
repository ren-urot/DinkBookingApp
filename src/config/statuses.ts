/**
 * Booking status definitions used in customer-facing messages and the staff guide.
 * The frontend only ever shows a status it has direct evidence for (a successful
 * submission acknowledged by the external service) or one returned by a secure
 * lookup service. All other changes come from staff.
 */

import { services } from "./services";

export type BookingStatus =
  | "request_submitted"
  | "request_sent"
  | "awaiting_payment"
  | "payment_submitted"
  | "under_verification"
  | "confirmed"
  | "unavailable"
  | "cancelled";

export interface StatusInfo {
  label: string;
  description: string;
  tone: "neutral" | "pending" | "progress" | "success" | "danger";
}

export const statusInfo: Record<BookingStatus, StatusInfo> = {
  request_submitted: {
    label: "Request Submitted",
    description: "Our booking service received your request.",
    tone: "neutral",
  },
  // Phone mode only: the website can't see the customer's messages, so it never
  // claims the facility "received" anything - only that the customer sent it.
  request_sent: {
    label: "Request Sent",
    description: "You sent your booking request from your phone. The facility will reply to acknowledge it.",
    tone: "neutral",
  },
  awaiting_payment: {
    label: "Awaiting Payment",
    description: "Your request was received and payment is pending.",
    tone: "pending",
  },
  payment_submitted: {
    label: "Payment Submitted",
    description: "You sent your payment details and receipt.",
    tone: "progress",
  },
  under_verification: {
    label: "Under Verification",
    description: "Staff are checking your payment and court availability.",
    tone: "progress",
  },
  confirmed: {
    label: "Confirmed",
    description: "Staff verified your payment and approved your reservation.",
    tone: "success",
  },
  unavailable: {
    label: "Unavailable",
    description: "The requested time slot cannot be reserved.",
    tone: "danger",
  },
  cancelled: {
    label: "Cancelled",
    description: "The reservation was cancelled under the facility's policy.",
    tone: "danger",
  },
};

const phoneMode = services.deliveryMode === "phone";

/** The normal, happy-path order shown in progress timelines. */
export const statusFlow: BookingStatus[] = [
  phoneMode ? "request_sent" : "request_submitted",
  "awaiting_payment",
  "payment_submitted",
  "under_verification",
  "confirmed",
];

/**
 * Steps only staff can move a booking to (the website never sets these itself).
 * For requests sent from the customer's phone, "awaiting_payment" is staff-driven too,
 * since only the facility's reply proves the request arrived (see StatusTimeline).
 */
export const staffUpdatedStatuses = new Set<BookingStatus>([
  "under_verification",
  "confirmed",
  "unavailable",
  "cancelled",
]);

/** Statuses that can occur with the current delivery mode, for the glossary. */
export const glossaryStatuses = (Object.keys(statusInfo) as BookingStatus[]).filter((s) =>
  phoneMode ? s !== "request_submitted" : s !== "request_sent",
);

export function isBookingStatus(v: unknown): v is BookingStatus {
  return typeof v === "string" && v in statusInfo;
}

/** Accepts "Awaiting Payment", "awaiting-payment", "AWAITING_PAYMENT", etc. from external services. */
export function parseStatus(v: unknown): BookingStatus | null {
  if (typeof v !== "string") return null;
  const key = v.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return isBookingStatus(key) ? key : null;
}
