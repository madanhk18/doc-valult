import { describe, expect, it } from "vitest";
import { getDaysRemaining, getDocumentStatus } from "./expiry";

const today = new Date("2026-09-27T00:00:00Z");

describe("getDaysRemaining", () => {
  it("returns 0 when expiry is today", () => {
    expect(getDaysRemaining("2026-09-27", today)).toBe(0);
  });

  it("returns positive days for a future date", () => {
    expect(getDaysRemaining("2026-10-04", today)).toBe(7);
  });

  it("returns negative days for a past date", () => {
    expect(getDaysRemaining("2026-09-20", today)).toBe(-7);
  });
});

describe("getDocumentStatus", () => {
  it("is expired when expiry date is in the past", () => {
    expect(getDocumentStatus("2026-09-26", today)).toBe("expired");
  });

  it("is expiring_soon on the expiry day itself", () => {
    expect(getDocumentStatus("2026-09-27", today)).toBe("expiring_soon");
  });

  it("is expiring_soon exactly 7 days out", () => {
    expect(getDocumentStatus("2026-10-04", today)).toBe("expiring_soon");
  });

  it("is valid at 8 days out", () => {
    expect(getDocumentStatus("2026-10-05", today)).toBe("valid");
  });

  it("is no_expiry when there is no expiry date", () => {
    expect(getDocumentStatus(null, today)).toBe("no_expiry");
  });
});
