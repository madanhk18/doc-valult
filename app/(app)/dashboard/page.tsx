import { getDocuments } from "@/lib/queries/documents";
import { StatCard } from "@/components/dashboard/stat-card";
import { UpcomingExpiries } from "@/components/dashboard/upcoming-expiries";
import { DocumentCard } from "@/components/documents/document-card";

export default async function DashboardPage() {
  const documents = await getDocuments();

  const counts = {
    total: documents.length,
    valid: documents.filter((d) => d.status === "valid").length,
    expiringSoon: documents.filter((d) => d.status === "expiring_soon").length,
    expired: documents.filter((d) => d.status === "expired").length,
  };

  const recent = documents.slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s the state of your documents.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Documents" value={counts.total} />
        <StatCard label="Valid" value={counts.valid} tone="success" />
        <StatCard label="Expiring Soon" value={counts.expiringSoon} tone="warning" />
        <StatCard label="Expired" value={counts.expired} tone="destructive" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Recent Documents</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet. Add your first one.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {recent.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </div>
        <UpcomingExpiries documents={documents} />
      </div>
    </div>
  );
}
