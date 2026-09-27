# Document Vault

Digital document locker + expiry reminder system. Phase 1 MVP: auth, document
upload with metadata, dashboard with expiry status, and a daily email
reminder cron for the final 7 days before a document expires.

## Setup

1. `npm install`
2. Create a Supabase project. Run `supabase/migrations/0001_init.sql` against
   it (via `supabase db push` or the SQL editor).
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your
     Supabase project settings
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings (server-only,
     never expose to the client)
   - `RESEND_API_KEY` — from resend.com
   - `CRON_SECRET` — any random string; also set it as the `Authorization:
     Bearer <secret>` header Vercel Cron sends (Vercel adds this automatically
     for its own cron invocations; set it manually when testing locally)
4. `npm run dev`

## Testing

- `npm test` runs the expiry status unit tests.
- Manual smoke test: register, add a document with an expiry date 3 days out,
  add yourself as a notification recipient in Settings, then call
  `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-expiries`
  and confirm you receive one email and a row appears in `notification_logs`.
  Call it again and confirm no duplicate email is sent.

## Deferred to later phases

OCR/scan extraction, SMS reminders, document sharing, renewal/version
history, Google Drive integration.
