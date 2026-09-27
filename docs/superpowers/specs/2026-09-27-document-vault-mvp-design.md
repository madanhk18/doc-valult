# Document Vault & Expiry Reminder — Phase 1 MVP Design

Date: 2026-09-27

## Purpose

Digital document locker + expiry reminder system. Users upload personal documents (DL, passport, insurance, etc), record issue/expiry dates, and get automatic email reminders during the final 7 days before expiry. Visual/structural reference: `expense-tracker` (madanhk18) — calm neutral theme, sidebar+bottom-nav layout, card-based dashboard.

Full product vision spans 28 feature areas (OCR/scan, SMS, sharing, renewal history, Google Drive). This spec covers **Phase 1 MVP only**, per the project's own stated priority order:

1. Auth
2. Add/upload document
3. Document storage
4. Document metadata
5. Expiry date tracking
6. Dashboard
7. 7-day reminder system
8. Email notifications

Deferred to later phases (each gets its own brainstorm → spec → plan cycle): SMS, renew/replace + document history, sharing, OCR/scanning, Google Drive integration.

## Stack

- Next.js 16 (App Router), TypeScript, React 19
- Tailwind CSS 4 + shadcn/radix-ui components (same design tokens as reference project)
- Supabase: Auth, Postgres, Storage (private bucket)
- react-hook-form + zod for forms/validation
- Resend for transactional email
- Vercel Cron (daily) for the expiry-check job
- sonner for toasts, lucide-react for icons

## Project Structure

```
app/
  (auth)/login/page.tsx
  (auth)/register/page.tsx
  auth/callback/route.ts
  (app)/dashboard/page.tsx
  (app)/documents/page.tsx
  (app)/documents/new/page.tsx
  (app)/documents/[id]/page.tsx
  (app)/settings/page.tsx
  api/cron/check-expiries/route.ts
components/
  layout/{sidebar,bottom-nav,topbar,logout-button}.tsx
  documents/{document-card,document-form,status-badge,upload-dropzone}.tsx
  dashboard/{stat-card,upcoming-expiries}.tsx
  ui/ (shadcn primitives, copied from reference conventions)
lib/
  supabase/{client,server,middleware}.ts
  queries/documents.ts
  actions/documents.ts
  actions/recipients.ts
  validations/document.schema.ts
  expiry.ts
  constants.ts (document type list)
supabase/migrations/0001_init.sql
```

## Data Model

**documents**
- id uuid pk
- user_id uuid references auth.users, not null
- name text not null
- type text not null (enum-like: predefined list + "custom")
- doc_number text
- holder_name text
- issue_date date
- expiry_date date
- file_path text not null (Storage object path)
- notes text
- tags text[]
- archived boolean default false
- created_at, updated_at timestamptz

**notification_recipients**
- id uuid pk
- user_id uuid references auth.users
- email text not null
- enabled boolean default true
- created_at timestamptz

**notification_logs**
- id uuid pk
- document_id uuid references documents
- recipient text not null
- day_offset int not null (days remaining at time of send, 7..0)
- sent_at timestamptz default now()
- status text (sent/failed)
- unique (document_id, recipient, day_offset) — one send per document/recipient/day, prevents duplicates even across multiple cron runs same day

RLS: every table filtered by `user_id = auth.uid()` (documents, notification_recipients directly; notification_logs via join to documents). Storage bucket `documents` is private; access only via signed URLs generated server-side for the owning user.

## Expiry Status Logic (`lib/expiry.ts`)

Pure function, computed at read time (never stored as stale column):

```
daysRemaining = expiry_date - today (in days)
if daysRemaining < 0        -> "expired"
else if daysRemaining <= 7  -> "expiring_soon"
else                        -> "valid"
```

Unit tested directly (boundary cases: exactly 7 days, exactly 0, negative, missing expiry_date).

## Document Types

Predefined constant list (Driving Licence, RC, Passport, Vehicle Insurance, PUC, Fitness Certificate, Aadhaar, PAN, Voter ID, Health Insurance, Life Insurance, Medical, Education Certificate, Professional Certificate, Membership Card, Government Document, Rental/Lease, Warranty, Other/Custom). Selecting "Other/Custom" reveals a free-text type field.

## Add Document Flow

"+ Add Document" → upload form (file input, accept pdf/jpg/jpeg/png) → file uploads to Supabase Storage under `{user_id}/{uuid}-{filename}` → metadata form (name, type, doc number, holder name, issue date, expiry date, notes, tags) → save creates `documents` row referencing the uploaded file_path.

No OCR in Phase 1 — user fills all fields manually. No camera-scan capture in Phase 1 (file upload only; a phone camera can still supply a photo via the file picker, which covers the casual case).

## Dashboard

Stat cards: Total Documents, Expiring Soon, Expired, Valid (counts derived from the status logic across all non-archived documents). Below: "Upcoming Expiries" list sorted by soonest expiry, and full document grid/list with search (by name/type/holder) and filter (All/Valid/Expiring Soon/Expired) and sort (expiry date/recently added/name).

## Document Detail Page

Preview (image/PDF via signed URL), all metadata fields, actions: View Full Document, Download, Edit Details, Archive, Delete. (Share and Renew/Replace are stubbed as disabled/"coming soon" in Phase 1 — full implementation is a later phase.)

## Reminder System

Daily cron (`/api/cron/check-expiries`, protected by a shared secret header):

1. Service-role Supabase client queries non-archived documents with `expiry_date` between today and today+7, or already expired (still send on expiry day itself, day_offset 0).
2. For each such document, fetch enabled `notification_recipients` for its user.
3. For each recipient, check `notification_logs` for an existing row with (document_id, recipient, day_offset=daysRemaining). Skip if present.
4. If absent, send email via Resend with subject/body reflecting days remaining ("expires in N days" / "expires tomorrow" / "expires today"), then insert log row (status sent/failed).
5. Vercel Cron config in `vercel.json` triggers this route once daily.

No reminders for documents beyond 7 days out or already archived/deleted.

## Settings (Phase 1 subset)

Account (name/email, read from Supabase Auth), Notification Recipients (add/remove email, enable/disable), Storage usage (sum of file sizes vs a fixed display quota placeholder). Security/Preferences/dark-mode deferred (theme toggle can reuse reference's next-themes if trivial, otherwise deferred).

## Error Handling

- File type/size validated both client (immediate feedback) and server (Storage upload path, reject >10MB or non-allowed mime types).
- Missing expiry_date documents excluded from reminder cron and shown as "no expiry tracked" status, not crashing status calc.
- Failed email send logged with status=failed in notification_logs (still counts as attempted for that day to avoid retry storms; visible in a simple admin/debug read if needed later).

## Testing

- Unit tests for `lib/expiry.ts` status boundaries.
- Manual end-to-end: register → add document with expiry in 3 days → seed/trigger cron manually → confirm one email received and one log row inserted → run cron again same day → confirm no duplicate email.

## Out of Scope (Phase 1)

OCR/data extraction, camera scanning, SMS, share links, renewal/version history, Google Drive integration, dark mode polish, session/security settings beyond basic auth. Each is a separate future brainstorm cycle building on this foundation.
