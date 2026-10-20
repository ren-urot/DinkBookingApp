import { facility } from "@/config/facility";
import { paymentMethodLabel, type PaymentMethod } from "@/config/payment";
import { formatPeso } from "./pricing";
import type { BookingRequest, BookingSummary } from "./submit";
import { formatDate, formatDuration, formatTimeRange } from "./time";
import { formatPhMobile } from "./validation";

/**
 * "Phone mode" messages: pre-written texts the customer sends from their own
 * SMS/Viber/Messenger/email app. No server, database or form service needed.
 */

export interface OutgoingMessage {
  subject: string;
  text: string;
}

function bookingLines(b: BookingSummary): string[] {
  return [
    `Court: ${b.court.name}`,
    `Date: ${formatDate(b.date, "long")}`,
    `Time: ${formatTimeRange(b.start, b.duration)} (${formatDuration(b.duration)})`,
    `Estimated total: ${formatPeso(b.fee.total)}`,
  ];
}

export function bookingMessage(b: BookingRequest): OutgoingMessage {
  const lines = [
    `BOOKING REQUEST ${b.reference}`,
    ...bookingLines(b),
    `Name: ${b.fullName}`,
    `Mobile: ${formatPhMobile(b.mobile)}`,
    ...(b.email ? [`Email: ${b.email}`] : []),
    ...(b.players ? [`Players: ${b.players}`] : []),
    ...(b.specialRequests ? [`Requests: ${b.specialRequests}`] : []),
    "",
    "Please confirm if this slot is available. I'll pay by GCash or bank transfer and send my receipt with this reference.",
  ];
  return {
    subject: `Booking request ${b.reference} - ${b.court.name}, ${formatDate(b.date, "medium")}`,
    text: lines.join("\n"),
  };
}

export function receiptMessage(r: {
  reference: string;
  method: PaymentMethod;
  transactionReference: string;
  amountPaid: number;
  mobile: string;
  booking: BookingSummary | null;
}): OutgoingMessage {
  const lines = [
    `PAYMENT RECEIPT ${r.reference}`,
    `Method: ${paymentMethodLabel[r.method]}`,
    `Transaction ref: ${r.transactionReference}`,
    `Amount paid: ${formatPeso(r.amountPaid)}`,
    ...(r.booking ? ["", "For booking:", ...bookingLines(r.booking)] : []),
    ...(r.mobile ? [`Mobile: ${formatPhMobile(r.mobile)}`] : []),
    "",
    "My receipt screenshot is attached. Please verify my payment and confirm my booking.",
  ];
  return {
    subject: `Payment receipt ${r.reference} - ${paymentMethodLabel[r.method]} ${formatPeso(r.amountPaid)}`,
    text: lines.join("\n"),
  };
}

/** Deep links that open the customer's app with the message pre-filled. */
export function messageLinks({ subject, text }: OutgoingMessage) {
  const body = encodeURIComponent(text);
  const c = facility.contact;
  return {
    // "?&body=" is understood by both Android and iOS.
    sms: `sms:${c.sms}?&body=${body}`,
    // Opens Viber's share screen; the customer picks the facility's chat.
    viber: `viber://forward?text=${body}`,
    email: `mailto:${c.email}?subject=${encodeURIComponent(subject)}&body=${body}`,
    // Messenger can't pre-fill text from a link, so the app copies it first.
    messenger: c.messengerUrl,
  };
}
