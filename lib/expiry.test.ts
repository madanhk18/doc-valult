import { describe, expect, it } from "vitest";
import { getDaysRemaining, getDocumentStatus, isReminderDue } from "./expiry";

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

  it("is expiring_soon exactly 30 days out", () => {
    expect(getDocumentStatus("2026-10-27", today)).toBe("expiring_soon");
  });

  it("is valid at 31 days out", () => {
    expect(getDocumentStatus("2026-10-28", today)).toBe("valid");
  });

  it("is no_expiry when there is no expiry date", () => {
    expect(getDocumentStatus(null, today)).toBe("no_expiry");
  });
});

describe("isReminderDue", () => {
  const days = [30, 7, 1, 0];

  it("is due on a chosen day", () => {
    expect(isReminderDue(7, days, [30])).toBe(true);
  });

  it("is not due again once today's reminder went out", () => {
    expect(isReminderDue(7, days, [30, 7])).toBe(false);
  });

  it("catches up with a reminder when a document is added late", () => {
    expect(isReminderDue(5, days, [])).toBe(true);
  });

  it("does not repeat the catch-up once it has gone out", () => {
    expect(isReminderDue(5, days, [6])).toBe(false);
  });

  it("retries a reminder whose send failed on its day", () => {
    // Day 30 went out; day 7 failed, so nothing was sent in the 7-day window.
    expect(isReminderDue(6, days, [30])).toBe(true);
  });

  it("waits while the document is further out than the earliest reminder", () => {
    expect(isReminderDue(45, days, [])).toBe(false);
  });

  it("never fires when reminders are off", () => {
    expect(isReminderDue(5, [], [])).toBe(false);
  });

  it("never fires for an expired document", () => {
    expect(isReminderDue(-2, days, [])).toBe(false);
  });
});
