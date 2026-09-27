import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getDocumentById, getSignedFileUrl, getSignedDownloadUrl } from "@/lib/queries/documents";
import { StatusBadge } from "@/components/documents/status-badge";
import { DocumentActions } from "@/components/documents/document-actions";
import { Card, CardContent } from "@/components/ui/card";

// The original extension is preserved when the file is uploaded (see
// filePath construction in lib/actions/documents.ts: `${user.id}/${uuid}-${file.name}`),
// so we can infer a preview kind from it without storing a separate mime-type column.
type PreviewKind = "image" | "pdf" | null;

function getPreviewKind(filePath: string): PreviewKind {
  const extension = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png"].includes(extension)) return "image";
  if (extension === "pdf") return "pdf";
  return null;
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocumentById(id);
  if (!document) notFound();

  const [fileUrl, downloadUrl] = await Promise.all([
    getSignedFileUrl(document.file_path),
    getSignedDownloadUrl(document.file_path),
  ]);
  const previewKind = getPreviewKind(document.file_path);

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

      {previewKind && (
        <Card>
          <CardContent className="p-4">
            {previewKind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL, not an optimizable static asset
              <img
                src={fileUrl}
                alt={document.name}
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
            ) : (
              <iframe
                src={fileUrl}
                title={document.name}
                className="h-[70vh] w-full rounded-md border border-border"
              />
            )}
          </CardContent>
        </Card>
      )}

      <DocumentActions id={document.id} fileUrl={fileUrl} downloadUrl={downloadUrl} />
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
