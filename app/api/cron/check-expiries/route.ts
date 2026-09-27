import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDaysRemaining } from "@/lib/expiry";
import { sendExpiryReminderEmail } from "@/lib/email";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  const in7Days = new Date(today);
  in7Days.setUTCDate(in7Days.getUTCDate() + 7);

  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("id, user_id, name, expiry_date")
    .eq("archived", false)
    .not("expiry_date", "is", null)
    .lte("expiry_date", in7Days.toISOString().slice(0, 10));

  if (documentsError) {
    return NextResponse.json({ error: documentsError.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of documents ?? []) {
    const daysRemaining = getDaysRemaining(doc.expiry_date!, today);
    if (daysRemaining < 0 || daysRemaining > 7) continue;

    const { data: recipients } = await supabase
      .from("notification_recipients")
      .select("email")
      .eq("user_id", doc.user_id)
      .eq("enabled", true);

    for (const recipient of recipients ?? []) {
      const { data: existingLog } = await supabase
        .from("notification_logs")
        .select("id")
        .eq("document_id", doc.id)
        .eq("recipient", recipient.email)
        .eq("day_offset", daysRemaining)
        .maybeSingle();

      if (existingLog) {
        skipped += 1;
        continue;
      }

      const result = await sendExpiryReminderEmail({
        to: recipient.email,
        documentName: doc.name,
        expiryDate: doc.expiry_date!,
        daysRemaining,
      });

      await supabase.from("notification_logs").insert({
        document_id: doc.id,
        recipient: recipient.email,
        day_offset: daysRemaining,
        status: result.success ? "sent" : "failed",
      });

      if (result.success) sent += 1;
      else failed += 1;
    }
  }

  return NextResponse.json({ documentsChecked: documents?.length ?? 0, sent, skipped, failed });
}
