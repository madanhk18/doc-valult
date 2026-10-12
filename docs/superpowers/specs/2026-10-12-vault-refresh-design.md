# Document Vault Refresh — Design

Date: 2026-10-12

## Why

The MVP works but feels flat (white on white, plain buttons), can't be added to an
iPhone home screen as a proper app, and expiry emails silently never arrive on the
live Vercel deploy. This round fixes email, lets users choose when they are
reminded, makes the app installable, and gives it a bold, colourful look with
dark mode.

## 1. Email that works and explains itself

Root causes found in the MVP:

- `EMAIL_FROM` unset → falls back to `reminders@resend.dev`, which Resend only
  delivers to the Resend account owner.
- Reminders only go to rows in `notification_recipients`; a fresh account has none.
- A failed send is logged under the same unique key as a successful one, so it is
  never retried.
- No way to trigger or test a send; the cron only runs once a day.
- Missing `CRON_SECRET` makes the cron return 500 before doing anything.

Changes:

- **Account email fallback**: if a user has no recipient rows at all, reminders go
  to their login email. Settings says so.
- **Retry failed sends**: the cron only skips a reminder whose log row has
  `status = 'sent'`; a `failed` row is retried and updated.
- **Email setup checklist** (Settings): yes/no for `RESEND_API_KEY`, a custom
  `EMAIL_FROM`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`. Never shows values.
- **Send test email** button: sends a sample reminder to the login email and shows
  Resend's real error, with a plain-English hint for the common "testing emails
  only to your own address" / unverified domain errors.
- **Check my documents now** button: runs the same reminder logic as the cron for
  the signed-in user only, and reports sent / skipped / failed.
- Emails get an HTML version (coloured header, document, days left, button to open
  the app) alongside the existing plain text.

## 2. Reminders you control

- New table `reminder_settings (user_id pk, days int[] default '{30,7,1,0}')`, RLS
  owner-only. Migration `0002_reminders.sql`.
- Choices: 30, 15, 7, 3, 1 days before, and on the day (0). Empty = reminders off.
- A reminder is due when nothing has been sent inside the current window (the
  most recent chosen day at or before today). This covers the chosen day, a
  document added late, a missed cron day, and a failed send being retried.
- Changing a document's expiry date (renewal) clears its reminder log, via a
  database trigger, so the new cycle starts fresh.
- Up to 10 recipients per user.
- "Expiring soon" status widens from 7 to 30 days (`EXPIRING_SOON_DAYS`), matching
  the earliest reminder option.
- Pure helper `isReminderDue(daysRemaining, days, sentDayOffsets)` with unit tests.

## 3. iPhone home screen app

- `app/manifest.ts` (standalone, start `/dashboard`, theme colour), icons generated
  in code (`app/apple-icon.tsx`, `app/pwa-icon/[size]/route.tsx`) — no binary assets.
- `appleWebApp` metadata, `viewport-fit=cover`, safe-area padding on the top bar and
  bottom nav.
- Minimal service worker (network-first, caches only the app shell) so Android/
  desktop treat it as installable. No caching of document pages or files.
- One-time "Add to Home Screen" tip on iPhone Safari when not already installed.
- `middleware.ts` → `proxy.ts` (Next 16 rename).

## 4. New look

- Navy/blue professional palette (no violet or pink), navy gradient hero, dark mode via `next-themes` (light / dark /
  system toggle in the top bar and Settings).
- Each document type maps to an icon + colour (`lib/doc-style.ts`), shown as a
  tinted icon chip on every card and the detail header.
- Status pill + "days left" bar in red / amber / green.
- Dashboard (no repeated numbers): gradient hero (greeting + total documents),
  three tappable status tiles (valid / expiring / expired → filtered list),
  "Needs attention" list, "Recently added" (excluding anything already in Needs
  attention).
- Documents: search, status chips, sort; colourful cards.
- Detail: coloured header, big days-left figure, details, preview, icon action
  buttons. Disabled "coming later" buttons removed.
- Upload: large tap-to-upload area (iPhone offers camera / photo library / files),
  image preview, file name + size.
- Floating dark bottom nav with a centre + button; Log out reachable on mobile
  from Settings.
- Login / register: gradient background, logo, friendlier copy.

## Testing

- `npm test`: expiry status (30-day threshold) and `isReminderDay`.
- `tsc`, `eslint`, `next build` clean.
- Manual: Settings checklist, test email, "check now", add to home screen.
