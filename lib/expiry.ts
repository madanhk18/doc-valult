export type DocumentStatus = "valid" | "expiring_soon" | "expired" | "no_expiry";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
  if (daysRemaining <= 7) return "expiring_soon";
  return "valid";
}
