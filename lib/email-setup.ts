import { FALLBACK_SENDER } from "@/lib/email";

export type EmailSetupCheck = {
  id: string;
  ok: boolean;
  label: string;
  /** What to do when it isn't ok. */
  fix: string;
};

/**
 * Which pieces email reminders need are in place. Reports yes/no only — env
 * values never leave the server.
 */
export function getEmailSetupChecks(): EmailSetupCheck[] {
  const from = process.env.EMAIL_FROM ?? "";
  return [
    {
      id: "resend",
      ok: Boolean(process.env.RESEND_API_KEY),
      label: "Resend API key",
      fix: "Add RESEND_API_KEY in Vercel → Settings → Environment Variables.",
    },
    {
      id: "sender",
      ok: Boolean(from) && from !== FALLBACK_SENDER && !from.includes("resend.dev"),
      label: "Sender address on your own domain",
      fix: "Verify a domain at resend.com/domains, then set EMAIL_FROM, e.g. Document Vault <reminders@yourdomain.com>. Without it, mail only reaches your Resend sign-up email.",
    },
    {
      id: "service",
      ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      label: "Supabase service role key",
      fix: "Add SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API).",
    },
    {
      id: "cron",
      ok: Boolean(process.env.CRON_SECRET),
      label: "Daily check secret",
      fix: "Add CRON_SECRET (any long random text). Without it the daily check stops before sending.",
    },
    {
      id: "site",
      ok: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      label: "App address for email links",
      fix: "Add NEXT_PUBLIC_SITE_URL, e.g. https://your-app.vercel.app.",
    },
  ];
}
