import { EXPIRING_SOON_DAYS, type DocumentStatus } from "@/lib/expiry";
import { STATUS_COLOR } from "./status-badge";

export function daysLeftText(daysRemaining: number | null): string {
  if (daysRemaining === null) return "No expiry date";
  if (daysRemaining < 0) {
    const ago = Math.abs(daysRemaining);
    return `Expired ${ago} day${ago === 1 ? "" : "s"} ago`;
  }
  if (daysRemaining === 0) return "Expires today";
  if (daysRemaining === 1) return "Expires tomorrow";
  return `${daysRemaining} days left`;
}

/**
 * A bar that drains as expiry approaches: full beyond the "expiring soon"
 * window (×3, so a year-out document doesn't look half empty), empty at expiry.
 */
export function DaysLeftBar({
  daysRemaining,
  status,
}: {
  daysRemaining: number | null;
  status: DocumentStatus;
}) {
  if (daysRemaining === null) return null;
  const window = EXPIRING_SOON_DAYS * 3;
  const percent = Math.max(0, Math.min(100, (daysRemaining / window) * 100));

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.max(percent, daysRemaining < 0 ? 100 : 4)}%`, backgroundColor: STATUS_COLOR[status] }}
      />
    </div>
  );
}
