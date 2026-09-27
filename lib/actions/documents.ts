"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { documentFormSchema } from "@/lib/validations/document.schema";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/constants";

function parseForm(formData: FormData) {
  const raw = {
    name: formData.get("name")?.toString() ?? "",
    type: formData.get("type")?.toString() ?? "",
    docNumber: formData.get("docNumber")?.toString() ?? "",
    holderName: formData.get("holderName")?.toString() ?? "",
    issueDate: formData.get("issueDate")?.toString() ?? "",
    expiryDate: formData.get("expiryDate")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
    tags: (formData.get("tags")?.toString() ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };

  return documentFormSchema.safeParse(raw);
}

export async function createDocument(formData: FormData): Promise<{ error?: string }> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid document details" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "A document file is required" };
  }
  if (!ACCEPTED_FILE_TYPES.includes(file.type as (typeof ACCEPTED_FILE_TYPES)[number])) {
    return { error: "File must be a PDF, JPG, or PNG" };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: "File must be 10MB or smaller" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const filePath = `${user.id}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("documents").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    doc_number: parsed.data.docNumber || null,
    holder_name: parsed.data.holderName || null,
    issue_date: parsed.data.issueDate || null,
    expiry_date: parsed.data.expiryDate || null,
    notes: parsed.data.notes || null,
    tags: parsed.data.tags,
    file_path: filePath,
  });

  if (insertError) {
    await supabase.storage.from("documents").remove([filePath]);
    return { error: insertError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/documents");
  redirect("/documents");
}

export async function updateDocument(id: string, formData: FormData): Promise<{ error?: string }> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid document details" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      doc_number: parsed.data.docNumber || null,
      holder_name: parsed.data.holderName || null,
      issue_date: parsed.data.issueDate || null,
      expiry_date: parsed.data.expiryDate || null,
      notes: parsed.data.notes || null,
      tags: parsed.data.tags,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  redirect(`/documents/${id}`);
}

export async function archiveDocument(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("documents").update({ archived: true }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/documents");
  redirect("/documents");
}

export async function deleteDocument(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: doc } = await supabase.from("documents").select("file_path").eq("id", id).single();
  if (doc?.file_path) {
    await supabase.storage.from("documents").remove([doc.file_path]);
  }

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/documents");
  redirect("/documents");
}
