"use server";

import { createClient } from "@/lib/supabase/server";
import { explainEmailError, sendExpiryReminderEmail } from "@/lib/email";
import { runReminders, type ReminderRunResult } from "@/lib/reminders";

type Failure = { ok: false; error: string; hint?: string };

export async function sendTestEmail(): Promise<{ ok: true; to: string } | Failure> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Not authenticated" };

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);

  const result = await sendExpiryReminderEmail({
    to: user.email,
    documentName: "Sample Driving Licence (test)",
    expiryDate: expiry.toISOString().slice(0, 10),
    daysRemaining: 7,
    documentUrl: process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/dashboard`
      : undefined,
  });

  if (!result.success) {
    const error = result.error ?? "Email could not be sent";
    return { ok: false, error, hint: explainEmailError(error) ?? undefined };
  }
  return { ok: true, to: user.email };
}

export async function checkMyDocumentsNow(): Promise<
  { ok: true; run: ReminderRunResult; hint?: string } | Failure
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not set", hint: "Add it in Vercel, then redeploy." };
  }

  try {
    const run = await runReminders({ userId: user.id });
    const firstError = run.errors[0];
    return { ok: true, run, hint: firstError ? (explainEmailError(firstError) ?? undefined) : undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Check failed" };
  }
}
