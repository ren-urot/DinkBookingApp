/** Cancellation, refund and house rules shown on the site. */

export const cancellationPolicy = {
  summary: "Free rescheduling up to 24 hours before your slot. Refunds follow the schedule below.",
  rules: [
    { title: "24+ hours before start", detail: "Full refund, or free rescheduling to another available slot." },
    { title: "12-24 hours before start", detail: "50% refund, or one free reschedule." },
    { title: "Less than 12 hours / no-show", detail: "No refund. Rescheduling is subject to staff approval." },
    {
      title: "Weather (outdoor courts)",
      detail: "If staff close an outdoor court due to rain or unsafe conditions, you may reschedule or get a full refund.",
    },
    {
      title: "Slot unavailable",
      detail: "If we cannot confirm your requested slot, any payment you already made is refunded in full.",
    },
  ],
  refundProcess:
    "Refunds are processed manually to the same GCash number or bank account used for payment, usually within 3-5 business days after approval. Refunds are not automatic.",
  howToCancel:
    "To cancel or reschedule, message us with your booking reference through any contact channel listed on this site.",
};

export const houseRules = [
  "Please arrive 10 minutes early. Sessions end on time so the next group can start.",
  "Non-marking court shoes only on indoor courts.",
  "Maximum of 8 players per court booking.",
];
