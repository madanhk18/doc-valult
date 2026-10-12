export type DocumentStatus = "valid" | "expiring_soon" | "expired" | "no_expiry";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** A document counts as "expiring soon" from the earliest reminder option onwards. */
export const EXPIRING_SOON_DAYS = 30;

/** Days before expiry a user can be reminded on. 0 = the expiry day itself. */
export const REMINDER_DAY_OPTIONS = [30, 15, 7, 3, 1, 0] as const;
export const DEFAULT_REMINDER_DAYS: number[] = [30, 7, 1, 0];

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getDaysRemaining(expiryDate: string, today: Date = new Date()): number {
  const expiry = startOfUtcDay(new Date(`${expiryDate}T00:00:00Z`));
  const now = startOfUtcDay(today);
  return Math.round((expiry - now) / MS_PER_DAY);
}

export function getDocumentStatus(
  expiryDate: string | null,
  today: Date = new Date()
): DocumentStatus {
  if (!expiryDate) return "no_expiry";

  const daysRemaining = getDaysRemaining(expiryDate, today);

  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= EXPIRING_SOON_DAYS) return "expiring_soon";
  return "valid";
}

/**
 * Whether to email about a document today, given the day offsets already
 * successfully sent for it. The "window" is the most recent chosen day at or
 * before today (e.g. with [30, 7, 1, 0] and 5 days left, the 7-day window).
 * A reminder is due if nothing has gone out inside that window yet, which
 * covers the chosen day itself, a document added late, a day the cron
 * missed, and a send that failed and needs retrying.
 */
export function isReminderDue(
  daysRemaining: number,
  reminderDays: readonly number[],
  sentDayOffsets: readonly number[]
): boolean {
  if (daysRemaining < 0) return false;
  const windowStarts = reminderDays.filter((d) => d >= daysRemaining);
  if (windowStarts.length === 0) return false;
  const windowStart = Math.min(...windowStarts);
  return !sentDayOffsets.some((d) => d >= daysRemaining && d <= windowStart);
}
