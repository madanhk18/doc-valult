# Document Vault

Digital document locker + expiry reminder system: auth, document upload with
metadata, a colourful dashboard with expiry status, dark mode, email reminders
on the days you choose (30 / 15 / 7 / 3 / 1 days before, or on the day), and
an installable home-screen app for iPhone and Android.

## Setup

1. `npm install`
2. Create a Supabase project. Run `supabase/migrations/0001_init.sql`, then
   `supabase/migrations/0002_reminders.sql`, against it (via `supabase db push`
   or the SQL editor, in that order).
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your
     Supabase project settings
   - `NEXT_PUBLIC_SITE_URL` — the deployed app URL (e.g.
     `http://localhost:3000` for local dev, or your production domain)
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings (server-only,
     never expose to the client)
   - `RESEND_API_KEY` — from resend.com
   - `EMAIL_FROM` — the sender address for expiry reminder emails, e.g.
     `Document Vault <reminders@yourdomain.com>`. This must be a domain
     verified for sending in your Resend account, or emails to real
     recipients will not be delivered. If unset, falls back to
     `reminders@resend.dev`, Resend's shared test sender, which only
     delivers to your own Resend-account email during local development.
   - `CRON_SECRET` — any random string; also set it as the `Authorization:
     Bearer <secret>` header Vercel Cron sends (Vercel adds this automatically
     for its own cron invocations; set it manually when testing locally)
4. `npm run dev`

On Vercel, add the same variables under Project → Settings → Environment
Variables and redeploy. **Settings → Email reminders** in the app shows a
✅ / ❌ for each one, has a **Send test email** button that shows Resend's real
error, and **Check my documents now** runs today's reminders for you on demand.

## Install on iPhone

Open the deployed site in **Safari** → tap **Share** → **Add to Home Screen**.
It opens full screen like an app. (Android/Chrome offers "Install app".)

## Testing

- `npm test` runs the expiry status and reminder-day unit tests.
- Manual smoke test: register, add a document with an expiry date 3 days out,
  then in Settings press **Check my documents now** (or call
  `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-expiries`
  ) and confirm you receive one email and a row appears in `notification_logs`.
  Run it again and confirm no duplicate email is sent.
- Reminders go to your login email until you add recipients in Settings.

## Deferred to later phases

OCR/scan extraction, SMS reminders, link-based sharing, renewal/version
history, Google Drive integration.
