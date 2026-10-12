import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { StatusBadge, STATUS_COLOR } from "./status-badge";
import { DocTypeIcon } from "./doc-type-icon";
import { DaysLeftBar, daysLeftText } from "./days-left";
import type { DocumentWithStatus } from "@/lib/queries/documents";

export function DocumentCard({ document }: { document: DocumentWithStatus }) {
  return (
    <Link
      href={`/documents/${document.id}`}
      className="group flex h-full flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <DocTypeIcon type={document.type} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{document.name}</p>
          <p className="truncate text-xs text-muted-foreground">{document.type}</p>
        </div>
        <StatusBadge status={document.status} />
      </div>

      <div className="mt-auto space-y-2">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-semibold" style={{ color: STATUS_COLOR[document.status] }}>
            {daysLeftText(document.daysRemaining)}
          </span>
          {document.expiry_date && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(document.expiry_date), "dd MMM yyyy")}
            </span>
          )}
        </div>
        <DaysLeftBar daysRemaining={document.daysRemaining} status={document.status} />
      </div>
    </Link>
  );
}

/** Compact one-line row for lists inside a card. */
export function DocumentRow({ document }: { document: DocumentWithStatus }) {
  return (
    <Link
      href={`/documents/${document.id}`}
      className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-accent"
    >
      <DocTypeIcon type={document.type} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{document.name}</p>
        <p className="truncate text-xs font-medium" style={{ color: STATUS_COLOR[document.status] }}>
          {daysLeftText(document.daysRemaining)}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
