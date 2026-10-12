import { Resend } from "resend";

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export const FALLBACK_SENDER = "Document Vault <reminders@resend.dev>";

function whenText(daysRemaining: number): string {
  if (daysRemaining === 0) return "today";
  if (daysRemaining === 1) return "tomorrow";
  return `in ${daysRemaining} days`;
}

function subjectFor(daysRemaining: number, documentName: string): string {
  return `⚠️ ${documentName} expires ${whenText(daysRemaining)}`;
}

function textBody(params: ReminderEmailParams): string {
  const { documentName, expiryDate, daysRemaining, documentUrl } = params;

  return `Your ${documentName} is approaching its expiry date.

Document: ${documentName}
Expiry Date: ${expiryDate}
Days Remaining: ${daysRemaining}

Your document expires ${whenText(daysRemaining)}. Please renew it before the expiry date.${
    documentUrl ? `\n\nOpen it: ${documentUrl}` : ""
  }`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlBody(params: ReminderEmailParams): string {
  const name = escapeHtml(params.documentName);
  const urgent = params.daysRemaining <= 1;
  const accent = urgent ? "#e5484d" : "#f59e0b";
  const headline = whenText(params.daysRemaining);
  const button = params.documentUrl
    ? `<a href="${escapeHtml(params.documentUrl)}" style="display:inline-block;margin-top:20px;padding:12px 20px;border-radius:12px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600">Open in Document Vault</a>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b">
  <div style="max-width:480px;margin:0 auto;padding:24px 16px">
    <div style="border-radius:20px;overflow:hidden;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <div style="padding:24px;background-color:#6d28d9;background-image:linear-gradient(135deg,#4f46e5,#9333ea);color:#ffffff">
        <div style="font-size:13px;opacity:.85">Document Vault reminder</div>
        <div style="margin-top:6px;font-size:22px;font-weight:700">${name}</div>
      </div>
      <div style="padding:24px">
        <div style="font-size:13px;color:#71717a">Expires</div>
        <div style="font-size:32px;font-weight:800;color:${accent}">${headline.charAt(0).toUpperCase()}${headline.slice(1)}</div>
        <div style="margin-top:4px;font-size:14px;color:#52525b">Expiry date: ${escapeHtml(params.expiryDate)}</div>
        <p style="margin-top:16px;font-size:14px;line-height:1.5;color:#3f3f46">Please renew it before the expiry date so you are never caught out.</p>
        ${button}
      </div>
    </div>
    <p style="margin-top:16px;text-align:center;font-size:12px;color:#a1a1aa">You get this because reminders are on in Document Vault settings.</p>
  </div>
</body></html>`;
}

export type ReminderEmailParams = {
  to: string;
  documentName: string;
  expiryDate: string;
  daysRemaining: number;
  documentUrl?: string;
};

export async function sendExpiryReminderEmail(
  params: ReminderEmailParams
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY is not set" };
  }

  try {
    const { error } = await getResendClient().emails.send({
      from: process.env.EMAIL_FROM || FALLBACK_SENDER,
      to: params.to,
      subject: subjectFor(params.daysRemaining, params.documentName),
      text: textBody(params),
      html: htmlBody(params),
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown email error" };
  }
}

/** Turns Resend's most common errors into a next step the user can act on. */
export function explainEmailError(message: string): string | null {
  const m = message.toLowerCase();
  if (m.includes("resend_api_key")) {
    return "Add RESEND_API_KEY in Vercel → Settings → Environment Variables, then redeploy.";
  }
  if (m.includes("api key is invalid") || m.includes("invalid api key") || m.includes("unauthorized")) {
    return "The Resend API key is wrong or was deleted. Create a new one at resend.com/api-keys and update RESEND_API_KEY in Vercel.";
  }
  if (m.includes("only send testing emails") || m.includes("your own email")) {
    return "You are using Resend's test sender, which only delivers to your Resend sign-up email. Verify your domain at resend.com/domains and set EMAIL_FROM to an address on it.";
  }
  if (m.includes("domain is not verified") || m.includes("not verified")) {
    return "The domain in EMAIL_FROM is not verified in Resend yet. Finish the DNS steps at resend.com/domains.";
  }
  if (m.includes("from") && m.includes("invalid")) {
    return 'EMAIL_FROM looks wrong. Use the form: Document Vault <reminders@yourdomain.com>';
  }
  return null;
}
