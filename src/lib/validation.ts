import { bookingRules } from "@/config/facility";
import { receiptUpload } from "@/config/services";

/**
 * Normalises Philippine mobile numbers to +639XXXXXXXXX.
 * Accepts 09XXXXXXXXX, 9XXXXXXXXX, 639XXXXXXXXX and +639XXXXXXXXX with spaces/dashes.
 */
export function normalizePhMobile(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const match = digits.match(/^(?:\+?63|0)?(9\d{9})$/);
  return match ? `+63${match[1]}` : null;
}

/** "+639171234567" -> "0917 123 4567" */
export function formatPhMobile(normalized: string): string {
  const local = `0${normalized.replace(/^\+63/, "")}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

export interface DetailsInput {
  fullName: string;
  mobile: string;
  email: string;
  players: string;
  specialRequests: string;
  consent: boolean;
}

export type DetailsErrors = Partial<Record<keyof DetailsInput, string>>;

export function validateDetails(d: DetailsInput): DetailsErrors {
  const errors: DetailsErrors = {};
  const name = d.fullName.trim();
  if (!name) errors.fullName = "Please enter your full name.";
  else if (name.length < 2) errors.fullName = "Name looks too short.";
  else if (name.length > 80) errors.fullName = "Please keep your name under 80 characters.";
  else if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(name)) errors.fullName = "Use letters, spaces, periods, apostrophes or hyphens only.";

  if (!d.mobile.trim()) errors.mobile = "Please enter your mobile number.";
  else if (!normalizePhMobile(d.mobile)) errors.mobile = "Enter a valid PH mobile number, e.g. 0917 123 4567.";

  if (d.email.trim() && !isValidEmail(d.email)) errors.email = "Enter a valid email address, or leave it blank.";

  if (d.players) {
    const n = Number(d.players);
    if (!Number.isInteger(n) || n < 1 || n > bookingRules.maxPlayers)
      errors.players = `Choose between 1 and ${bookingRules.maxPlayers} players.`;
  }

  if (d.specialRequests.length > bookingRules.specialRequestsMaxLength)
    errors.specialRequests = `Please keep this under ${bookingRules.specialRequestsMaxLength} characters.`;

  if (!d.consent) errors.consent = "Please agree so we can use your details to manage this booking.";
  return errors;
}

/** Booking references look like DD-261020-7KQ3P. */
export function normalizeReference(v: string): string {
  return v.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidReference(v: string): boolean {
  return /^[A-Z]{2,4}-\d{6}-[A-Z0-9]{5}$/.test(normalizeReference(v));
}

export function parseAmount(v: string): number | null {
  const cleaned = v.replace(/[₱,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 && n < 1_000_000 ? n : null;
}

/** File signatures, so a renamed .exe is not accepted as a "screenshot". */
async function sniffType(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (head[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  if (ascii(4, 8) === "ftyp" && /^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(ascii(8, 12))) return "image/heic";
  return null;
}

export async function validateReceiptFile(file: File | null): Promise<string | null> {
  if (!file) return "Please attach a screenshot or photo of your payment receipt.";
  if (file.size === 0) return "This file is empty. Please choose another one.";
  if (file.size > receiptUpload.maxBytes)
    return `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${receiptUpload.maxBytes / 1024 / 1024} MB - try a screenshot instead of a full photo.`;
  const declaredOk = !file.type || (receiptUpload.acceptedMime as readonly string[]).includes(file.type);
  const sniffed = await sniffType(file);
  if (!declaredOk || !sniffed) return `Unsupported file. Please upload ${receiptUpload.acceptedLabel}.`;
  // The contents must match the declared kind (e.g. a PDF renamed to .png is rejected).
  const family = (mime: string) => (mime === "application/pdf" ? "pdf" : "image");
  if (file.type && family(file.type) !== family(sniffed)) return `This file's contents don't match its type. Please upload ${receiptUpload.acceptedLabel}.`;
  return null;
}
