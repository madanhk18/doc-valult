import { createClient } from "@/lib/supabase/server";
import { getDaysRemaining, getDocumentStatus, type DocumentStatus } from "@/lib/expiry";

export type DocumentRow = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  doc_number: string | null;
  holder_name: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  file_path: string;
  notes: string | null;
  tags: string[];
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type DocumentWithStatus = DocumentRow & {
  status: DocumentStatus;
  daysRemaining: number | null;
};

function withStatus(row: DocumentRow): DocumentWithStatus {
  return {
    ...row,
    status: getDocumentStatus(row.expiry_date),
    daysRemaining: row.expiry_date ? getDaysRemaining(row.expiry_date) : null,
  };
}

export async function getDocuments(): Promise<DocumentWithStatus[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as DocumentRow[]).map(withStatus);
}

export async function getDocumentById(id: string): Promise<DocumentWithStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).single();

  if (error) return null;
  return withStatus(data as DocumentRow);
}

export async function getSignedFileUrl(filePath: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(filePath, 60 * 10);

  if (error || !data) throw new Error(error?.message ?? "Could not create signed URL");
  return data.signedUrl;
}
