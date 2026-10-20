import { services } from "@/config/services";

/**
 * Client for the admin Apps Script (docs/admin-apps-script.gs). Every call
 * carries the PIN the admin typed; the script checks it on Google's side.
 * The PIN is kept in memory only - never stored in the browser.
 */

export interface SheetRow {
  /** Row number in the sheet (2 = first booking under the headers). */
  row: number;
  court: string;
  date: string;
  start: string;
  end: string;
  status: string;
  reference: string;
}

export type AdminStatus = "Held" | "Confirmed" | "Cancelled";

export interface NewBooking {
  court: string;
  date: string;
  start: string;
  end: string;
  status: Exclude<AdminStatus, "Cancelled">;
  reference: string;
  force?: boolean;
}

export type AdminErrorCode = "auth" | "locked" | "setup" | "conflict" | "duplicate" | "stale" | "invalid" | "network" | "error";

export class AdminError extends Error {
  constructor(
    public code: AdminErrorCode,
    message: string,
    public conflict?: SheetRow,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

const TIMEOUT_MS = 25_000;

async function call<T>(pin: string, action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!services.adminScriptUrl) throw new AdminError("setup", "The admin script isn't connected yet. See README > Admin page.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    // text/plain avoids a CORS preflight, which Apps Script web apps don't answer.
    res = await fetch(services.adminScriptUrl, {
      method: "POST",
      body: JSON.stringify({ pin, action, ...payload }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      credentials: "omit",
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (err) {
    const timedOut = (err as Error).name === "AbortError";
    throw new AdminError("network", timedOut ? "Google took too long to respond. Try again." : "Couldn't reach the admin script. Check your connection.");
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => null);
  if (!data || typeof data !== "object") throw new AdminError("error", "The admin script sent an unexpected response. Is it deployed with access 'Anyone'?");
  if (!data.ok) throw new AdminError((data.code as AdminErrorCode) ?? "error", data.error ?? "Something went wrong.", data.conflict);
  return data as T;
}

export const adminApi = {
  list: (pin: string) => call<{ rows: SheetRow[] }>(pin, "list").then((d) => d.rows),
  add: (pin: string, booking: NewBooking) => call<{ row: number }>(pin, "add", { booking }),
  setStatus: (pin: string, row: SheetRow, status: AdminStatus) =>
    call(pin, "setStatus", {
      row: row.row,
      // Must match docs/admin-apps-script.gs fingerprintOf(): guards against editing a row that moved.
      fingerprint: [row.court, row.date, row.start, row.end, row.reference].join("|"),
      status,
    }),
};
