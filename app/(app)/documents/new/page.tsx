import { createDocument } from "@/lib/actions/documents";
import { DocumentForm } from "@/components/documents/document-form";
import { PageTitle } from "@/components/shared/page-title";

export default function NewDocumentPage() {
  return (
    <div className="space-y-5">
      <div className="mx-auto max-w-xl">
        <PageTitle title="Add document" subtitle="Snap it once — we'll remind you before it expires." />
      </div>
      <DocumentForm action={createDocument} />
    </div>
  );
}
