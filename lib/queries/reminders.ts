import { createClient } from "@/lib/supabase/server";
import { DEFAULT_REMINDER_DAYS } from "@/lib/expiry";

export type ReminderSettings = {
  days: number[];
  /** False until 0002_reminders.sql has been run; the defaults apply meanwhile. */
  migrated: boolean;
};

export async function getReminderSettings(): Promise<ReminderSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reminder_settings").select("days").maybeSingle();

  if (error) return { days: DEFAULT_REMINDER_DAYS, migrated: false };
  return { days: data?.days ?? DEFAULT_REMINDER_DAYS, migrated: true };
}
