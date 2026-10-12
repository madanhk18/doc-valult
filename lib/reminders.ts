import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_REMINDER_DAYS, REMINDER_DAY_OPTIONS, getDaysRemaining, isReminderDue } from "@/lib/expiry";
import { sendExpiryReminderEmail } from "@/lib/email";

export type ReminderRunResult = {
  documentsChecked: number;
  sent: number;
  skipped: number;
  failed: number;
  /** Distinct send errors, so the caller can show what went wrong. */
  errors: string[];
};

type DocRow = { id: string; user_id: string; name: string; expiry_date: string };
type LogRow = { document_id: string; recipient: string; day_offset: number; status: string };

// Resend's free plan allows 2 requests a second; stay under it.
const SEND_GAP_MS = 600;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends every expiry reminder that is due today. Used by the daily cron (all
 * users) and by Settings → "Check my documents now" (one user).
 *
 * - Each user's chosen days come from reminder_settings (defaults if unset).
 * - With no recipient rows at all, reminders go to the account's login email.
 * - A send logged as `failed` is retried; only `sent` counts as done (see
 *   isReminderDue for how missed and failed reminders catch up).
 */
export async function runReminders({
  userId,
  today = new Date(),
}: { userId?: string; today?: Date } = {}): Promise<ReminderRunResult> {
  const supabase = createAdminClient();
  const result: ReminderRunResult = { documentsChecked: 0, sent: 0, skipped: 0, failed: 0, errors: [] };

  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + Math.max(...REMINDER_DAY_OPTIONS));

  let docsQuery = supabase
    .from("documents")
    .select("id, user_id, name, expiry_date")
    .eq("archived", false)
    .not("expiry_date", "is", null)
    .gte("expiry_date", today.toISOString().slice(0, 10))
    .lte("expiry_date", horizon.toISOString().slice(0, 10));
  if (userId) docsQuery = docsQuery.eq("user_id", userId);

  const { data: docData, error: docsError } = await docsQuery;
  if (docsError) throw new Error(docsError.message);

  const documents = (docData ?? []) as DocRow[];
  result.documentsChecked = documents.length;
  if (documents.length === 0) return result;

  const userIds = [...new Set(documents.map((d) => d.user_id))];
  const documentIds = documents.map((d) => d.id);

  const [settingsRes, recipientsRes, logsRes] = await Promise.all([
    supabase.from("reminder_settings").select("user_id, days").in("user_id", userIds),
    supabase.from("notification_recipients").select("user_id, email, enabled").in("user_id", userIds),
    supabase
      .from("notification_logs")
      .select("document_id, recipient, day_offset, status")
      .in("document_id", documentIds),
  ]);

  // A partial view of recipients or past sends would mean emailing the wrong
  // people or re-sending, so stop instead.
  if (recipientsRes.error) throw new Error(recipientsRes.error.message);
  if (logsRes.error) throw new Error(logsRes.error.message);

  // Before 0002_reminders.sql the table is missing; everyone gets the defaults.
  const daysByUser = new Map<string, number[]>(
    (settingsRes.error ? [] : (settingsRes.data ?? [])).map((r) => [r.user_id as string, r.days as number[]])
  );

  const recipientRows = recipientsRes.data ?? [];
  const recipientsByUser = new Map<string, string[]>();
  for (const id of userIds) {
    const rows = recipientRows.filter((r) => r.user_id === id);
    if (rows.length > 0) {
      recipientsByUser.set(id, rows.filter((r) => r.enabled).map((r) => r.email as string));
      continue;
    }
    const { data, error } = await supabase.auth.admin.getUserById(id);
    if (error) throw new Error(error.message);
    recipientsByUser.set(id, data.user?.email ? [data.user.email] : []);
  }

  const logs = (logsRes.data ?? []) as LogRow[];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  for (const doc of documents) {
    const daysRemaining = getDaysRemaining(doc.expiry_date, today);
    const reminderDays = daysByUser.get(doc.user_id) ?? DEFAULT_REMINDER_DAYS;

    for (const recipient of recipientsByUser.get(doc.user_id) ?? []) {
      const sentOffsets = logs
        .filter((l) => l.document_id === doc.id && l.recipient === recipient && l.status === "sent")
        .map((l) => l.day_offset);
      if (!isReminderDue(daysRemaining, reminderDays, sentOffsets)) {
        if (sentOffsets.includes(daysRemaining)) result.skipped += 1;
        continue;
      }

      if (result.sent + result.failed > 0) await sleep(SEND_GAP_MS);
      const send = await sendExpiryReminderEmail({
        to: recipient,
        documentName: doc.name,
        expiryDate: doc.expiry_date,
        daysRemaining,
        documentUrl: siteUrl ? `${siteUrl}/documents/${doc.id}` : undefined,
      });

      const { error: logError } = await supabase.from("notification_logs").upsert(
        {
          document_id: doc.id,
          recipient,
          day_offset: daysRemaining,
          status: send.success ? "sent" : "failed",
          sent_at: new Date().toISOString(),
        },
        { onConflict: "document_id,recipient,day_offset" }
      );
      if (logError && !result.errors.includes(logError.message)) result.errors.push(logError.message);

      if (send.success) {
        result.sent += 1;
      } else {
        result.failed += 1;
        if (send.error && !result.errors.includes(send.error)) result.errors.push(send.error);
      }
    }
  }

  return result;
}
