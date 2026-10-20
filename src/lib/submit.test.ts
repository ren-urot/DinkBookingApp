import { describe, expect, it } from "vitest";
import { getCourt } from "@/config/courts";
import { bookingFromParams, bookingToParams } from "./bookingUrl";
import { calculateFee } from "./pricing";
import { ensureAcknowledged, SubmissionError } from "./submit";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const html = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/html" } });
const appShell = '<!doctype html><html><body><div id="root"></div></body></html>';

describe("ensureAcknowledged", () => {
  it("accepts an explicit JSON acknowledgement", async () => {
    await expect(ensureAcknowledged(json({ ok: true }), "formspree")).resolves.toBeUndefined();
    await expect(ensureAcknowledged(json({ success: true }), "webhook")).resolves.toBeUndefined();
  });

  it("never treats a bare 2xx as success for Formspree or webhooks", async () => {
    await expect(ensureAcknowledged(html(appShell), "webhook")).rejects.toBeInstanceOf(SubmissionError);
    await expect(ensureAcknowledged(new Response(null, { status: 204 }), "webhook")).rejects.toBeInstanceOf(SubmissionError);
    await expect(ensureAcknowledged(json({}), "formspree")).rejects.toBeInstanceOf(SubmissionError);
  });

  it("surfaces the service's own error message", async () => {
    await expect(ensureAcknowledged(json({ ok: false, error: "Spam detected" }), "webhook")).rejects.toThrow("Spam detected");
    await expect(ensureAcknowledged(json({ errors: [{ message: "Form not found" }] }, 404), "formspree")).rejects.toThrow(
      "Form not found",
    );
  });

  it("rejects Netlify responses that are really the app's own page (SPA fallback)", async () => {
    await expect(ensureAcknowledged(html(appShell), "netlify")).rejects.toBeInstanceOf(SubmissionError);
    await expect(ensureAcknowledged(html("<html><body>Thank you!</body></html>"), "netlify")).resolves.toBeUndefined();
    await expect(ensureAcknowledged(html("Not found", 404), "netlify")).rejects.toBeInstanceOf(SubmissionError);
  });
});

describe("booking URL round trip", () => {
  const court = getCourt("court-2")!;
  const booking = {
    reference: "DD-261020-7KQ3P",
    court,
    date: "2026-10-22",
    start: 18 * 60,
    duration: 120,
    fee: calculateFee(court, "2026-10-22", 18 * 60, 120),
    fullName: "Maria Santos",
    mobile: "+639171234567",
  };

  it("keeps the booking but never personal details", () => {
    const params = bookingToParams(booking);
    expect(params.toString()).not.toMatch(/Maria|917/);
    expect(bookingFromParams(params)).toEqual({
      reference: booking.reference,
      court,
      date: booking.date,
      start: booking.start,
      duration: booking.duration,
      fee: booking.fee,
    });
  });

  it("rejects tampered or incomplete parameters", () => {
    const params = bookingToParams(booking);
    params.set("dur", "45");
    expect(bookingFromParams(params)).toBeNull();
    expect(bookingFromParams(new URLSearchParams("ref=DD-261020-7KQ3P"))).toBeNull();
  });
});
