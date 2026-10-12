# Vault Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working expiry emails, user-chosen reminder days, iPhone home-screen install, and a colourful dark-mode UI.

**Architecture:** Reminder logic moves out of the cron route into `lib/reminders.ts` so the cron and a Settings "check now" action share it. Pure helpers (`lib/expiry.ts`) stay unit-tested. Visual identity lives in tokens (`app/globals.css`) plus a type→icon/colour map (`lib/doc-style.ts`).

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Supabase, Resend, next-themes, vitest.

**Spec:** `docs/superpowers/specs/2026-10-12-vault-refresh-design.md`

## Global Constraints

- Reminder day options exactly: 30, 15, 7, 3, 1, 0. Default `{30,7,1,0}`.
- `EXPIRING_SOON_DAYS = 30`.
- Never send env var values to the client — booleans only.
- No binary assets: icons generated with `ImageResponse`.
- Service worker must not cache document pages or signed file URLs.

---

### Task 1: Expiry + reminder helpers (TDD)
**Files:** Modify `lib/expiry.ts`, `lib/expiry.test.ts`
- [ ] Update tests: expiring_soon at 30 days, valid at 31; add `isReminderDue` tests (chosen day, already sent, late add catch-up, failed retry, too early, off, expired).
- [ ] Run `npm test` — fails.
- [ ] Add `EXPIRING_SOON_DAYS`, `REMINDER_DAY_OPTIONS`, `DEFAULT_REMINDER_DAYS`, `isReminderDue`.
- [ ] Run `npm test` — passes.

### Task 2: Migration + reminder settings
**Files:** Create `supabase/migrations/0002_reminders.sql`, `lib/queries/reminders.ts`, `lib/actions/reminders.ts`
- [ ] `reminder_settings` table + RLS owner policy.
- [ ] `getReminderDays()` (defaults when no row / table missing), `saveReminderDays(days)` (validated against options, upsert).

### Task 3: Email + shared reminder runner
**Files:** Modify `lib/email.ts`, `app/api/cron/check-expiries/route.ts`; Create `lib/reminders.ts`, `lib/email-setup.ts`, `lib/actions/email.ts`
- [ ] HTML email + text; `explainEmailError()` hint mapping.
- [ ] `runReminders({ userId? })`: per-user days, account-email fallback, retry `failed` logs.
- [ ] Cron route calls `runReminders()`.
- [ ] `getEmailSetupStatus()` booleans; server actions `sendTestEmail()`, `checkMyDocumentsNow()`.

### Task 4: PWA
**Files:** Create `app/manifest.ts`, `app/apple-icon.tsx`, `app/icon.tsx`, `app/pwa-icon/[size]/route.tsx`, `components/brand/logo-mark.tsx`, `public/sw.js`, `components/pwa/pwa-register.tsx`, `components/pwa/install-hint.tsx`; Modify `app/layout.tsx`; Rename `middleware.ts` → `proxy.ts`.

### Task 5: Theme + shared UI
**Files:** Modify `app/globals.css`; Create `components/theme-provider.tsx`, `components/theme-toggle.tsx`, `lib/doc-style.ts`, `components/shared/icon-chip.tsx`, `components/documents/doc-type-icon.tsx`, `components/documents/days-left.tsx`, `components/shared/empty-state.tsx`; Modify `components/documents/status-badge.tsx`.

### Task 6: Layout
**Files:** Modify `app/(app)/layout.tsx`, `components/layout/{sidebar,bottom-nav,topbar,nav-items}.tsx`.

### Task 7: Pages
**Files:** Modify dashboard, documents list/filters/card, detail + actions, new/edit + form, login/register + auth form, settings (+ new `components/settings/{reminder-days-form,email-setup-card,appearance-card}.tsx`). Delete `components/dashboard/{stat-card,upcoming-expiries}.tsx` if unused.

### Task 8: Verify + docs
- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- [ ] README: new migration, env checklist, home-screen steps.
