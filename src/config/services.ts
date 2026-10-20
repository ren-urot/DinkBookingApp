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

/**
 * Turns a Google Sheet link into its CSV download URL (first tab), which Google
 * serves with CORS so the browser can read it. Accepts the normal share link
 * (".../spreadsheets/d/<id>/edit?usp=sharing") or a ready-made CSV link.
 */
export function toSheetCsvUrl(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const id = v.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/)?.[1];
  if (id && !/\/d\/e\//.test(v) && !/gviz|export|output=csv/.test(v)) {
    const gid = v.match(/[#&?]gid=(\d+)/)?.[1];
    return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${gid ? `&gid=${gid}` : ""}`;
  }
  return readUrl(v);
}

const provider = readProvider();

export const services = {
  provider,
  // Netlify handles form posts to a static HTML file that defines the forms.
  bookingEndpoint: provider === "netlify" ? "/__forms.html" : readUrl(env.VITE_BOOKING_ENDPOINT),
  receiptEndpoint: provider === "netlify" ? "/__forms.html" : readUrl(env.VITE_RECEIPT_ENDPOINT),
  lookupEndpoint: readUrl(env.VITE_LOOKUP_ENDPOINT),
  availabilityEndpoint: readUrl(env.VITE_AVAILABILITY_ENDPOINT),
  /** Google Sheet of confirmed/held bookings; those times are greyed out. See README. */
  bookedSheetUrl: toSheetCsvUrl(env.VITE_BOOKED_SHEET_URL),
  /** The sheet's normal link, for the admin page's "Open Google Sheet" button. */
  bookedSheetEditUrl: readUrl(env.VITE_BOOKED_SHEET_URL),
  /** Google Apps Script web app (/exec) used by /admin to update the sheet. PIN-protected on Google's side. */
  adminScriptUrl: readUrl(env.VITE_ADMIN_SCRIPT_URL),
  /** Netlify form names; must match the hidden forms in public/__forms.html. */
  netlifyForms: { booking: "booking-request", receipt: "payment-receipt" },
  requestTimeoutMs: 20_000,
  receiptTimeoutMs: 60_000,
  isDemo: provider === "demo",
  /**
   * How requests and receipts reach the facility:
   * - "phone": no service configured. The customer's own SMS/Viber/Messenger/
   *   email app sends a pre-written message. Zero setup, nothing to host.
   * - "service": a form service (Formspree/Netlify/webhook) receives them and
   *   acknowledges receipt. Switches on automatically once configured.
   */
  deliveryMode: (provider ? "service" : "phone") as "service" | "phone",
} as const;

export const receiptUpload = {
  maxBytes: 5 * 1024 * 1024,
  /** Extensions + MIME types accepted on the client. The service must enforce its own limits too. */
  acceptedMime: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"],
  acceptedLabel: "JPG, PNG, WEBP, HEIC or PDF, up to 5 MB",
  acceptAttr: "image/*,application/pdf",
} as const;
