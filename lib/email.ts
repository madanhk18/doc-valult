import { Resend } from "resend";

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

function subjectFor(daysRemaining: number, documentName: string): string {
  if (daysRemaining === 0) return `⚠️ ${documentName} expires today`;
  if (daysRemaining === 1) return `⚠️ ${documentName} expires tomorrow`;
  return `⚠️ ${documentName} expires in ${daysRemaining} days`;
}

function bodyFor(params: { documentName: string; expiryDate: string; daysRemaining: number }): string {
  const { documentName, expiryDate, daysRemaining } = params;
  const whenText =
    daysRemaining === 0 ? "today" : daysRemaining === 1 ? "tomorrow" : `in ${daysRemaining} days`;

  return `Your ${documentName} is approaching its expiry date.

Document: ${documentName}
Expiry Date: ${expiryDate}
Days Remaining: ${daysRemaining}

Your document expires ${whenText}. Please renew it before the expiry date.`;
}

export async function sendExpiryReminderEmail(params: {
  to: string;
  documentName: string;
  expiryDate: string;
  daysRemaining: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResendClient().emails.send({
      from: process.env.EMAIL_FROM || "Document Vault <reminders@resend.dev>",
      to: params.to,
      subject: subjectFor(params.daysRemaining, params.documentName),
      text: bodyFor(params),
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown email error" };
  }
}
