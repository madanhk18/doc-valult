import { getDocuments } from "@/lib/queries/documents";
import { DocumentCard } from "@/components/documents/document-card";
import { DocumentFilters } from "@/components/documents/document-filters";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const documents = await getDocuments();

  let filtered = documents;

  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        (d.holder_name ?? "").toLowerCase().includes(q)
    );
  }

  if (params.status && params.status !== "all") {
    filtered = filtered.filter((d) => d.status === params.status);
  }

  const sort = params.sort ?? "expiry";
  filtered = [...filtered].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "recent") return b.created_at.localeCompare(a.created_at);
    // expiry: documents without an expiry date sort last
    if (a.expiry_date === null) return 1;
    if (b.expiry_date === null) return -1;
    return a.expiry_date.localeCompare(b.expiry_date);
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Documents</h1>
      <DocumentFilters />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents match.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
