import { describe, expect, it } from "vitest";
import { getCourt } from "@/config/courts";
import { facility } from "@/config/facility";
import { bookingMessage, messageLinks, parseBookingMessage, receiptMessage } from "./message";
import { calculateFee } from "./pricing";

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
  email: "",
  players: "4",
  specialRequests: "",
  submittedAt: "2026-10-20 09:00",
};

describe("bookingMessage", () => {
  it("includes everything staff need, in plain readable lines", () => {
    const { subject, text } = bookingMessage(booking);
    expect(subject).toContain("DD-261020-7KQ3P");
    expect(text).toContain("BOOKING REQUEST DD-261020-7KQ3P");
    expect(text).toContain("Court: Court 2");
    expect(text).toContain("Date: Thursday, October 22, 2026");
    expect(text).toContain("Time: 6:00 PM - 8:00 PM (2 hours)");
    expect(text).toMatch(/Estimated total: ₱1,200/);
    expect(text).toContain("Name: Maria Santos");
    expect(text).toContain("Mobile: 0917 123 4567");
    expect(text).toContain("Players: 4");
  });

  it("leaves out empty optional fields instead of printing blanks", () => {
    const { text } = bookingMessage(booking);
    expect(text).not.toContain("Email:");
    expect(text).not.toContain("Requests:");
    expect(text).not.toMatch(/\n\n\n/);
  });
});

describe("receiptMessage", () => {
  it("includes the payment and, when known, the booking", () => {
    const { text } = receiptMessage({
      reference: booking.reference,
      method: "gcash",
      transactionReference: "1234567890123",
      amountPaid: 1200,
      mobile: "",
      booking,
    });
    expect(text).toContain("PAYMENT RECEIPT DD-261020-7KQ3P");
    expect(text).toContain("Method: GCash");
    expect(text).toContain("Transaction ref: 1234567890123");
    expect(text).toContain("For booking:");
    expect(text).not.toContain("Mobile:");
  });
});

describe("parseBookingMessage", () => {
  it("reads back everything the admin needs from a customer's message", () => {
    expect(parseBookingMessage(bookingMessage(booking).text)).toEqual({
      reference: "DD-261020-7KQ3P",
      courtId: "court-2",
      date: "2026-10-22",
      start: 18 * 60,
      end: 20 * 60,
    });
  });

  it("copes with forwarded text and full court names", () => {
    const text = "Fwd: from +63917...\n\nBOOKING REQUEST dd-261020-abcde\nCourt: Court 1 - Center Court\nDate: Saturday, October 24, 2026\nTime: 9:00 PM - 12:00 AM (3 hours)";
    expect(parseBookingMessage(text)).toEqual({
      reference: "DD-261020-ABCDE",
      courtId: "court-1",
      date: "2026-10-24",
      start: 21 * 60,
      end: 24 * 60,
    });
  });

  it("returns nothing for unrelated text", () => {
    expect(parseBookingMessage("hello, is court 2 free tomorrow?")).toEqual({});
  });
});

describe("messageLinks", () => {
  it("pre-fills the facility's SMS number and email with the encoded message", () => {
    const links = messageLinks({ subject: "Hi & bye", text: "Line 1\nLine 2 ₱" });
    expect(links.sms).toBe(`sms:${facility.contact.sms}?&body=Line%201%0ALine%202%20%E2%82%B1`);
    expect(links.email).toBe(`mailto:${facility.contact.email}?subject=Hi%20%26%20bye&body=Line%201%0ALine%202%20%E2%82%B1`);
    expect(links.viber).toBe("viber://forward?text=Line%201%0ALine%202%20%E2%82%B1");
  });
});
