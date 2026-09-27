import { notFound } from "next/navigation";
import { getDocumentById } from "@/lib/queries/documents";
import { updateDocument } from "@/lib/actions/documents";
import { DocumentForm } from "@/components/documents/document-form";

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocumentById(id);
  if (!document) notFound();

  const updateWithId = updateDocument.bind(null, id);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Edit Document</h1>
      <DocumentForm action={updateWithId} initialValues={document} requireFile={false} />
    </div>
  );
}
