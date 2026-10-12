import { notFound } from "next/navigation";
import { getDocumentById } from "@/lib/queries/documents";
import { updateDocument } from "@/lib/actions/documents";
import { DocumentForm } from "@/components/documents/document-form";
import { PageTitle } from "@/components/shared/page-title";

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
    <div className="space-y-5">
      <div className="mx-auto max-w-xl">
        <PageTitle title="Edit document" />
      </div>
      <DocumentForm action={updateWithId} initialValues={document} requireFile={false} />
    </div>
  );
}
