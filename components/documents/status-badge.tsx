import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/lib/expiry";

const STATUS_LABEL: Record<DocumentStatus, string> = {
  valid: "Valid",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  no_expiry: "No Expiry Tracked",
};

const STATUS_CLASS: Record<DocumentStatus, string> = {
  valid: "bg-success/15 text-success border-success/30",
  expiring_soon: "bg-warning/15 text-warning border-warning/30",
  expired: "bg-destructive/15 text-destructive border-destructive/30",
  no_expiry: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
