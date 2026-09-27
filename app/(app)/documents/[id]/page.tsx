import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getDocumentById, getSignedFileUrl } from "@/lib/queries/documents";
import { StatusBadge } from "@/components/documents/status-badge";
import { DocumentActions } from "@/components/documents/document-actions";
import { Card, CardContent } from "@/components/ui/card";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocumentById(id);
  if (!document) notFound();

  const fileUrl = await getSignedFileUrl(document.file_path);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{document.name}</h1>
          <p className="text-sm text-muted-foreground">{document.type}</p>
        </div>
        <StatusBadge status={document.status} />
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <Field label="Document Number" value={document.doc_number} />
          <Field label="Holder Name" value={document.holder_name} />
          <Field
            label="Issue Date"
            value={document.issue_date ? format(new Date(document.issue_date), "dd MMM yyyy") : null}
          />
          <Field
            label="Expiry Date"
            value={document.expiry_date ? format(new Date(document.expiry_date), "dd MMM yyyy") : null}
          />
          <Field
            label="Days Remaining"
            value={document.daysRemaining !== null ? String(document.daysRemaining) : null}
          />
          {document.notes && <Field label="Notes" value={document.notes} />}
        </CardContent>
      </Card>

      <DocumentActions id={document.id} fileUrl={fileUrl} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
