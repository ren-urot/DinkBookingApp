import { describe, expect, it } from "vitest";
import {
  formatPhMobile,
  isValidReference,
  normalizePhMobile,
  parseAmount,
  validateDetails,
  validateReceiptFile,
} from "./validation";

describe("PH mobile numbers", () => {
  it.each(["09171234567", "0917 123 4567", "+63 917 123 4567", "639171234567", "9171234567", "0917-123-4567"])(
    "normalises %s",
    (input) => expect(normalizePhMobile(input)).toBe("+639171234567"),
  );

  it.each(["12345", "08171234567", "0917123456", "+1 917 123 4567", ""])("rejects %s", (input) => {
    expect(normalizePhMobile(input)).toBeNull();
  });

  it("formats for display", () => {
    expect(formatPhMobile("+639171234567")).toBe("0917 123 4567");
  });
});

describe("booking references and amounts", () => {
  it("accepts generated-style references, case-insensitively", () => {
    expect(isValidReference("DD-261020-7KQ3P")).toBe(true);
    expect(isValidReference(" dd-261020-7kq3p ")).toBe(true);
    expect(isValidReference("DD-2610-7KQ3P")).toBe(false);
  });

  it("parses peso amounts", () => {
    expect(parseAmount("1,200")).toBe(1200);
    expect(parseAmount("₱1300.50")).toBe(1300.5);
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("12.345")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("validateDetails", () => {
  const ok = { fullName: "Maria Santos", mobile: "09171234567", email: "", players: "", specialRequests: "", consent: true };

  it("passes a minimal valid form", () => {
    expect(validateDetails(ok)).toEqual({});
  });

  it("requires name, mobile and consent", () => {
    expect(Object.keys(validateDetails({ ...ok, fullName: "", mobile: "", consent: false })).sort()).toEqual([
      "consent",
      "fullName",
      "mobile",
    ]);
  });

  it("checks optional fields only when filled", () => {
    expect(validateDetails({ ...ok, email: "nope" }).email).toBeDefined();
    expect(validateDetails({ ...ok, players: "9" }).players).toBeDefined();
  });
});

describe("validateReceiptFile", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const pdf = new TextEncoder().encode("%PDF-1.7 test");

  it("accepts a real PNG and a real PDF", async () => {
    expect(await validateReceiptFile(new File([png], "receipt.png", { type: "image/png" }))).toBeNull();
    expect(await validateReceiptFile(new File([pdf], "receipt.pdf", { type: "application/pdf" }))).toBeNull();
  });

  it("rejects missing, empty, oversized and disguised files", async () => {
    expect(await validateReceiptFile(null)).toMatch(/attach/);
    expect(await validateReceiptFile(new File([], "a.png", { type: "image/png" }))).toMatch(/empty/);
    expect(await validateReceiptFile(new File([png, new Uint8Array(6 * 1024 * 1024)], "big.png", { type: "image/png" }))).toMatch(/limit is 5 MB/);
    expect(await validateReceiptFile(new File(["hello"], "fake.png", { type: "image/png" }))).toMatch(/Unsupported/);
    expect(await validateReceiptFile(new File([pdf], "renamed.png", { type: "image/png" }))).toMatch(/don't match/);
  });
});
