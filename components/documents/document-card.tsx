import Link from "next/link";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import type { DocumentWithStatus } from "@/lib/queries/documents";

export function DocumentCard({ document }: { document: DocumentWithStatus }) {
  const daysLabel =
    document.daysRemaining === null
      ? null
      : document.daysRemaining < 0
        ? `Expired ${Math.abs(document.daysRemaining)} days ago`
        : `${document.daysRemaining} day${document.daysRemaining === 1 ? "" : "s"} remaining`;

  return (
    <Link href={`/documents/${document.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{document.name}</div>
                <div className="text-xs text-muted-foreground">{document.type}</div>
              </div>
            </div>
            <StatusBadge status={document.status} />
          </div>
          {document.expiry_date && (
            <div className="text-sm text-muted-foreground">
              Expires: {format(new Date(document.expiry_date), "dd MMM yyyy")}
            </div>
          )}
          {daysLabel && <div className="text-sm font-medium">{daysLabel}</div>}
        </CardContent>
      </Card>
    </Link>
  );
}
