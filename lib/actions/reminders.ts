"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { REMINDER_DAY_OPTIONS } from "@/lib/expiry";

const daysSchema = z
  .array(z.number().int())
  .refine((days) => days.every((d) => (REMINDER_DAY_OPTIONS as readonly number[]).includes(d)), {
    message: "Pick reminder days from the list",
  });

export async function saveReminderDays(days: number[]): Promise<{ error?: string }> {
  const parsed = daysSchema.safeParse(days);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const unique = [...new Set(parsed.data)].sort((a, b) => b - a);
  const { error } = await supabase
    .from("reminder_settings")
    .upsert({ user_id: user.id, days: unique }, { onConflict: "user_id" });

  if (error) {
    if (error.code === "42P01" || error.message.includes("reminder_settings")) {
      return { error: "Run supabase/migrations/0002_reminders.sql in Supabase first" };
    }
    return { error: error.message };
  }

  revalidatePath("/settings");
  return {};
}
