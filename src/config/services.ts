/**
 * External service configuration, read from VITE_* environment variables.
 * See .env.example. These values are public - never put secrets here.
 */

export type SubmissionProvider = "formspree" | "netlify" | "webhook" | "demo";

const env = import.meta.env;

function readProvider(): SubmissionProvider | null {
  const raw = (env.VITE_SUBMISSION_PROVIDER ?? "").trim().toLowerCase();
  if (raw === "formspree" || raw === "netlify" || raw === "webhook") return raw;
  // Demo mode never sends anything, so it is only honoured in local development.
  // A production build with "demo" is treated as unconfigured, which makes every
  // submission fail loudly instead of showing a false success.
  if (raw === "demo" && env.DEV) return "demo";
  return null;
}

function readUrl(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  // Netlify Forms posts to the site itself.
  if (v.startsWith("/")) return v;
  try {
    const url = new URL(v);
    // All booking and receipt traffic must use HTTPS (plain-HTTP localhost only during development).
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol === "https:" || (local && env.DEV)) return url.toString();
  } catch {
    /* invalid URL */
  }
  console.error(`[services] Ignoring invalid or non-HTTPS endpoint: ${v}`);
  return null;
}

const provider = readProvider();

export const services = {
  provider,
  // Netlify handles form posts to a static HTML file that defines the forms.
  bookingEndpoint: provider === "netlify" ? "/__forms.html" : readUrl(env.VITE_BOOKING_ENDPOINT),
  receiptEndpoint: provider === "netlify" ? "/__forms.html" : readUrl(env.VITE_RECEIPT_ENDPOINT),
  lookupEndpoint: readUrl(env.VITE_LOOKUP_ENDPOINT),
  availabilityEndpoint: readUrl(env.VITE_AVAILABILITY_ENDPOINT),
  /** Netlify form names; must match the hidden forms in public/__forms.html. */
  netlifyForms: { booking: "booking-request", receipt: "payment-receipt" },
  requestTimeoutMs: 20_000,
  receiptTimeoutMs: 60_000,
  isDemo: provider === "demo",
} as const;

export const receiptUpload = {
  maxBytes: 5 * 1024 * 1024,
  /** Extensions + MIME types accepted on the client. The service must enforce its own limits too. */
  acceptedMime: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"],
  acceptedLabel: "JPG, PNG, WEBP, HEIC or PDF, up to 5 MB",
  acceptAttr: "image/*,application/pdf",
} as const;
