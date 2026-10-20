import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { BookingRequest } from "@/lib/submit";
import type { DetailsInput } from "@/lib/validation";

/**
 * Booking state lives in memory only. Personal and payment details are never
 * written to localStorage/sessionStorage; the external service is the
 * authoritative record. A page refresh therefore clears the draft - the
 * customer keeps their booking reference on screen and in the service's records.
 */

export interface Draft {
  courtId: string | null;
  date: string | null;
  start: number | null;
  duration: number | null;
  details: DetailsInput;
}

export const emptyDetails: DetailsInput = {
  fullName: "",
  mobile: "",
  email: "",
  players: "",
  specialRequests: "",
  consent: false,
};

const emptyDraft: Draft = { courtId: null, date: null, start: null, duration: null, details: emptyDetails };

interface BookingContextValue {
  draft: Draft;
  updateDraft: (patch: Partial<Draft>) => void;
  resetDraft: () => void;
  /** The most recent request the external service acknowledged in this session. */
  submitted: BookingRequest | null;
  setSubmitted: (b: BookingRequest) => void;
  /** References whose receipt was acknowledged in this session. */
  receiptSentFor: string[];
  markReceiptSent: (reference: string) => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [submitted, setSubmittedState] = useState<BookingRequest | null>(null);
  const [receiptSentFor, setReceiptSentFor] = useState<string[]>([]);

  const updateDraft = useCallback((patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch })), []);
  const resetDraft = useCallback(() => setDraft(emptyDraft), []);
  const setSubmitted = useCallback((b: BookingRequest) => setSubmittedState(b), []);
  const markReceiptSent = useCallback(
    (reference: string) => setReceiptSentFor((list) => (list.includes(reference) ? list : [...list, reference])),
    [],
  );

  const value = useMemo(
    () => ({ draft, updateDraft, resetDraft, submitted, setSubmitted, receiptSentFor, markReceiptSent }),
    [draft, updateDraft, resetDraft, submitted, setSubmitted, receiptSentFor, markReceiptSent],
  );
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used inside BookingProvider");
  return ctx;
}
