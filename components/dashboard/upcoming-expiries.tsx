import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DocumentWithStatus } from "@/lib/queries/documents";

export function UpcomingExpiries({ documents }: { documents: DocumentWithStatus[] }) {
  const upcoming = documents
    .filter((d) => d.daysRemaining !== null)
    .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming Expiries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">No upcoming expiries.</p>
        )}
        {upcoming.map((doc) => (
          <Link
            key={doc.id}
            href={`/documents/${doc.id}`}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent"
          >
            <span className="text-sm font-medium">{doc.name}</span>
            <span className="text-sm text-muted-foreground">
              {(doc.daysRemaining ?? 0) < 0
                ? "Expired"
                : `${doc.daysRemaining} days remaining`}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
