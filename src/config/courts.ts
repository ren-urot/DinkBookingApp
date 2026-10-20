import type { DayHours, Weekday } from "./facility";

/**
 * Court catalogue and rental rates. Rates are per hour in PHP.
 * Bookings are billed in 30-minute blocks; a block that starts inside a peak
 * window is billed at the peak rate.
 */

export interface Court {
  id: string;
  name: string;
  /** Short label shown on chips, e.g. "C1". */
  code: string;
  type: "indoor" | "outdoor";
  image: string;
  imageAlt: string;
  description: string;
  features: string[];
  /** Standard hourly rate. */
  rate: number;
  /** Peak hourly rate (applies during peak windows). */
  peakRate: number;
  /** Overrides facility hours for this court. Omit a day to use facility hours. */
  hours?: Partial<Record<Weekday, DayHours | null>>;
  featured?: boolean;
}

/** Peak windows. Weekday list + "HH:MM" range (end exclusive). */
export const peakWindows: { days: Weekday[]; start: string; end: string; label: string }[] = [
  { days: [1, 2, 3, 4, 5], start: "17:00", end: "24:00", label: "Weekdays, 5:00 PM onwards" },
  { days: [0, 6], start: "00:00", end: "24:00", label: "Saturdays & Sundays, all day" },
];

const outdoorHours: Partial<Record<Weekday, DayHours | null>> = {
  0: { open: "06:00", close: "21:00" },
  1: { open: "06:00", close: "21:00" },
  2: { open: "06:00", close: "21:00" },
  3: { open: "06:00", close: "21:00" },
  4: { open: "06:00", close: "21:00" },
  5: { open: "06:00", close: "21:00" },
  6: { open: "06:00", close: "21:00" },
};

export const courts: Court[] = [
  {
    id: "court-1",
    name: "Court 1 - Center Court",
    code: "C1",
    type: "indoor",
    image: "/courts/court-1.jpg",
    imageAlt: "Indoor Court 1 with a blue playing surface, net and courtside benches",
    description: "Our flagship tournament-spec indoor court with spectator seating.",
    features: ["Air-conditioned", "Tournament lines", "Spectator seating", "LED lighting"],
    rate: 500,
    peakRate: 650,
    featured: true,
  },
  {
    id: "court-2",
    name: "Court 2",
    code: "C2",
    type: "indoor",
    image: "/courts/court-2.jpg",
    imageAlt: "Indoor Court 2 with a green playing surface, net and courtside benches",
    description: "Cushioned acrylic surface - easy on the knees for long sessions.",
    features: ["Air-conditioned", "Cushioned surface", "LED lighting"],
    rate: 450,
    peakRate: 600,
    featured: true,
  },
  {
    id: "court-3",
    name: "Court 3 - Open Air",
    code: "C3",
    type: "outdoor",
    image: "/courts/court-3.jpg",
    imageAlt: "Outdoor Court 3 with a blue playing surface, surrounded by trees",
    description: "Covered outdoor court with a breezy, open-air feel.",
    features: ["Covered roof", "Night lights", "Bench & shade area"],
    rate: 350,
    peakRate: 450,
    featured: true,
    // Outdoor courts close earlier because of neighbourhood noise rules.
    hours: outdoorHours,
  },
  {
    id: "court-4",
    name: "Court 4 - Training Court",
    code: "C4",
    type: "outdoor",
    image: "/courts/court-4.jpg",
    imageAlt: "Outdoor Court 4 with a blue playing surface, surrounded by trees",
    description: "Great for drills and coaching, with a ball machine available on request.",
    features: ["Ball machine (on request)", "Practice wall", "Night lights"],
    rate: 300,
    peakRate: 400,
    hours: outdoorHours,
  },
];

export const addOns = [
  { name: "Paddle rental", price: "₱100 / paddle", note: "Pay at the front desk" },
  { name: "Ball set (3 pcs)", price: "₱150", note: "Pay at the front desk" },
  { name: "Ball machine", price: "₱200 / hour", note: "Court 4 only - mention it in special requests" },
];

export function getCourt(id: string | null | undefined): Court | undefined {
  return courts.find((c) => c.id === id);
}
