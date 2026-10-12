import type { DocumentStatus } from "@/lib/expiry";
import { cn } from "@/lib/utils";

export const STATUS_LABEL: Record<DocumentStatus, string> = {
  valid: "Valid",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  no_expiry: "No expiry",
};

/** CSS colour per status, shared by badges, bars and tiles. */
export const STATUS_COLOR: Record<DocumentStatus, string> = {
  valid: "var(--success)",
  expiring_soon: "var(--warning)",
  expired: "var(--destructive)",
  no_expiry: "var(--muted-foreground)",
};

export function StatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", className)}
      style={{ color, backgroundColor: `color-mix(in oklch, ${color} 14%, transparent)` }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {STATUS_LABEL[status]}
    </span>
  );
}
