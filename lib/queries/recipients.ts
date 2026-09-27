import { createClient } from "@/lib/supabase/server";

export type RecipientRow = {
  id: string;
  user_id: string;
  email: string;
  enabled: boolean;
  created_at: string;
};

export async function getRecipients(): Promise<RecipientRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_recipients")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data as RecipientRow[];
}
