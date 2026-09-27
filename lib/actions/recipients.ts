"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email("Enter a valid email");

export async function addRecipient(formData: FormData): Promise<{ error?: string }> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notification_recipients")
    .insert({ user_id: user.id, email: parsed.data });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function removeRecipient(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("notification_recipients").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function toggleRecipient(id: string, enabled: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_recipients")
    .update({ enabled })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}
