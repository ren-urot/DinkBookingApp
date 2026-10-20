import { facility, type Weekday } from "@/config/facility";

/**
 * Dates are handled as "YYYY-MM-DD" strings and times as minutes after midnight,
 * always in the facility's timezone - never the visitor's device timezone.
 */

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Current date and minute-of-day at the facility. */
export function facilityNow(at: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: facility.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function toUtcDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function weekdayOf(date: string): Weekday {
  return toUtcDate(date).getUTCDay() as Weekday;
}

export function addDays(date: string, days: number): string {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isValidDateString(v: string | null | undefined): v is string {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return toUtcDate(v).toISOString().slice(0, 10) === v;
}

type DateStyle = "long" | "medium" | "short" | "weekday" | "day" | "month";

export function formatDate(date: string, style: DateStyle = "long"): string {
  const options: Record<DateStyle, Intl.DateTimeFormatOptions> = {
    long: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
    medium: { weekday: "short", month: "short", day: "numeric", year: "numeric" },
    short: { month: "short", day: "numeric" },
    weekday: { weekday: "short" },
    day: { day: "numeric" },
    month: { month: "short" },
  };
  return new Intl.DateTimeFormat(facility.locale, { ...options[style], timeZone: "UTC" }).format(toUtcDate(date));
}

export function formatTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const suffix = h24 < 12 ? "AM" : "PM";
  return `${h12}:${String(m % 60).padStart(2, "0")} ${suffix}`;
}

export function formatTimeRange(start: number, durationMinutes: number): string {
  return `${formatTime(start)} - ${formatTime(start + durationMinutes)}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} ${h === 1 ? "hour" : "hours"}`;
  return `${m} min`;
}

/** Short form for chips, e.g. "1.5 hrs". */
export function formatDurationShort(minutes: number): string {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} ${hours === 1 ? "hr" : "hrs"}`;
}

export const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** ISO timestamp with the facility's UTC offset, for submissions. */
export function facilityTimestamp(at: Date = new Date()): string {
  const { date, minutes } = facilityNow(at);
  return `${date} ${toHHMM(minutes)} (${facility.timezone})`;
}
