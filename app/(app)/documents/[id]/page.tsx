import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { getDocumentById, getSignedFileUrl, getSignedDownloadUrl } from "@/lib/queries/documents";
import { StatusBadge, STATUS_COLOR } from "@/components/documents/status-badge";
import { DocumentActions } from "@/components/documents/document-actions";
import { DocTypeIcon } from "@/components/documents/doc-type-icon";
import { DaysLeftBar, daysLeftText } from "@/components/documents/days-left";

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

/** `${userId}/${uuid}-${original name}` → original name. */
function originalFileName(filePath: string): string {
  const base = filePath.split("/").pop() ?? filePath;
  return base.replace(/^[0-9a-f-]{36}-/i, "");
}

function formatDate(value: string | null) {
  return value ? format(new Date(value), "dd MMM yyyy") : null;
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
  const statusColor = STATUS_COLOR[document.status];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/documents" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Documents
      </Link>

      <section className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <DocTypeIcon type={document.type} size="lg" solid />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight">{document.name}</h1>
            <p className="text-sm text-muted-foreground">{document.type}</p>
          </div>
          <StatusBadge status={document.status} />
        </div>

        {document.daysRemaining !== null && (
          <div className="mt-5 space-y-2 rounded-2xl p-4" style={{ backgroundColor: `color-mix(in oklch, ${statusColor} 10%, transparent)` }}>
            <p className="text-2xl font-bold" style={{ color: statusColor }}>
              {daysLeftText(document.daysRemaining)}
            </p>
            <DaysLeftBar daysRemaining={document.daysRemaining} status={document.status} />
          </div>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
          <Field label="Expiry date" value={formatDate(document.expiry_date)} />
          <Field label="Issue date" value={formatDate(document.issue_date)} />
          <Field label="Document number" value={document.doc_number} />
          <Field label="Holder" value={document.holder_name} />
        </dl>
        {document.notes && (
          <div className="mt-4 rounded-2xl bg-muted p-3 text-sm whitespace-pre-wrap">{document.notes}</div>
        )}
        {document.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {document.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </section>

      <DocumentActions
        id={document.id}
        name={document.name}
        fileName={originalFileName(document.file_path)}
        fileUrl={fileUrl}
        downloadUrl={downloadUrl}
      />

      {previewKind && (
        <section className="overflow-hidden rounded-[28px] border border-border bg-card p-3 shadow-sm">
          {previewKind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL, not an optimizable static asset
            <img src={fileUrl} alt={document.name} className="max-h-[70vh] w-full rounded-2xl object-contain" />
          ) : (
            <iframe src={fileUrl} title={document.name} className="h-[70vh] w-full rounded-2xl" />
          )}
        </section>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-semibold">{value}</dd>
    </div>
  );
}
