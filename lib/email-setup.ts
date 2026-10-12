import { FALLBACK_SENDER } from "@/lib/email";

export type EmailSetupCheck = {
  id: string;
  ok: boolean;
  label: string;
  /** What to do when it isn't ok. */
  fix: string;
  /** Not needed for reminders to reach the Resend sign-up email. */
  optional?: boolean;
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
      label: "Own domain for sending (optional)",
      fix: "Without a domain, reminders only reach the email you signed up to Resend with. To remind other people, verify a domain at resend.com/domains and set EMAIL_FROM, e.g. Document Vault <reminders@yourdomain.com>.",
      optional: true,
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
