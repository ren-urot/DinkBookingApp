/**
 * Public facility information. Edit this file to update what customers see.
 * Nothing here should be secret - it is bundled into the public website.
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export interface DayHours {
  /** 24h "HH:MM". */
  open: string;
  /** 24h "HH:MM". Use "24:00" for midnight. */
  close: string;
}

export const facility = {
  name: "Dink District Pickleball",
  shortName: "Dink District",
  tagline: "Courts ready. Paddles up.",
  intro:
    "A friendly pickleball hub with indoor and outdoor courts, LED lighting for night games, and a players' lounge. Reserve a court in minutes - no account needed.",
  highlights: ["Indoor & outdoor courts", "LED lighting for night play", "Paddle & ball rentals", "Free parking"],
  /** IANA timezone used for all booking dates and times. */
  timezone: "Asia/Manila",
  currency: "PHP",
  locale: "en-PH",

  contact: {
    phone: "+63 917 123 4567",
    phoneHref: "+639171234567",
    /** Number that accepts SMS / Viber messages. */
    sms: "+639171234567",
    email: "bookings@dinkdistrict.ph",
    messengerUrl: "https://m.me/dinkdistrictpickleball",
    facebookUrl: "https://facebook.com/dinkdistrictpickleball",
    /** Hours when staff answer messages and verify payments. */
    responseHours: "8:00 AM - 9:00 PM daily",
  },

  location: {
    addressLines: ["2F Courtside Building, 123 Rally Street", "Brgy. San Antonio, Pasig City, Metro Manila 1605"],
    mapsUrl: "https://maps.google.com/?q=Pasig+City+Metro+Manila",
    directions: "Entrance beside the main lobby. Free parking at the basement level.",
  },

  /** Default facility hours. Individual courts may override these. null = closed. */
  hours: {
    0: { open: "07:00", close: "22:00" },
    1: { open: "06:00", close: "22:00" },
    2: { open: "06:00", close: "22:00" },
    3: { open: "06:00", close: "22:00" },
    4: { open: "06:00", close: "22:00" },
    5: { open: "06:00", close: "23:00" },
    6: { open: "06:00", close: "23:00" },
  } as Record<Weekday, DayHours | null>,

  /** Dates the whole facility is closed ("YYYY-MM-DD"). */
  closedDates: ["2026-12-25", "2027-01-01"] as string[],

  privacyContactEmail: "privacy@dinkdistrict.ph",

  /** 2-4 capital letters that start every booking reference, e.g. DD-261020-7KQ3P. */
  referencePrefix: "DD",
} as const;

export const bookingRules = {
  /** How many days ahead customers may request a booking (including today). */
  advanceBookingDays: 30,
  /** Minimum minutes between now and the requested start time. */
  minLeadMinutes: 60,
  /** Granularity of start times, in minutes. */
  slotIntervalMinutes: 30,
  /** Allowed booking durations, in minutes. */
  durationOptions: [60, 90, 120, 150, 180, 240] as number[],
  maxPlayers: 8,
  /** Hours the customer has to pay after submitting a request. */
  paymentWindowHours: 2,
  specialRequestsMaxLength: 500,
} as const;
