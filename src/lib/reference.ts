import { facility } from "@/config/facility";
import { facilityNow } from "./time";

// No 0/O, 1/I/L so references are easy to read out over the phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Shown in placeholders and hints. */
export const EXAMPLE_REFERENCE = `${facility.referencePrefix}-261020-7KQ3P`;

/** Generates a booking reference like DD-261020-7KQ3P (prefix-YYMMDD-random). */
export function generateBookingReference(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  const date = facilityNow().date.replace(/-/g, "").slice(2);
  return `${facility.referencePrefix}-${date}-${random}`;
}
