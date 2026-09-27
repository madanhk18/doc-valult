import { createDocument } from "@/lib/actions/documents";
import { DocumentForm } from "@/components/documents/document-form";

export default function NewDocumentPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Add Document</h1>
      <DocumentForm action={createDocument} />
    </div>
  );
}
