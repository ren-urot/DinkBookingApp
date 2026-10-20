/**
 * Payment instructions - the ONLY place payment account details live.
 * Every page reads from here so details are never duplicated.
 * Double-check these with the facility owner before going live.
 */

export const payment = {
  /**
   * SAFETY SWITCH. While true, every payment section shows a "sample details -
   * do not send money" warning and production builds print a warning.
   * Set to false only after replacing ALL details below (and public/gcash-qr.svg)
   * with the facility's real, verified accounts.
   */
  isSample: true,
  gcash: {
    label: "GCash",
    accountName: "DINK DISTRICT SPORTS INC.",
    /** Masked name GCash shows before you confirm a transfer. */
    displayName: "DI** DI***** S.",
    mobileNumber: "0917 123 4567",
    /** Path under /public, or null to hide the QR code. Replace with the official GCash QR. */
    qrImage: "/gcash-qr.svg" as string | null,
    referenceHint: "The 13-digit Ref No. on your GCash receipt",
  },
  bank: {
    label: "Bank transfer",
    bankName: "BPI (Bank of the Philippine Islands)",
    accountName: "Dink District Sports Inc.",
    accountNumber: "1234 5678 90",
    accountType: "Savings",
    branch: "Pasig - Ortigas Branch",
    referenceHint: "The transaction / confirmation number from your bank app or InstaPay/PESONet receipt",
  },
  /** Shown under both methods. */
  notes: [
    "Pay the exact total shown in your booking.",
    "Add your booking reference to the transfer notes or message if your app allows it.",
    "Keep a screenshot of the successful transfer - you will upload it next.",
  ],
} as const;

export type PaymentMethod = "gcash" | "bank";

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  gcash: payment.gcash.label,
  bank: payment.bank.label,
};
