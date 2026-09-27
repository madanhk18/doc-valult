# Document Vault & Expiry Reminder — Phase 1 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working document vault app — auth, document upload with metadata, dashboard with expiry status, and a daily cron job that emails reminders during the final 7 days before a document expires.

**Architecture:** Next.js 16 App Router with Supabase for auth/database/storage. Server actions handle all writes (no separate REST API except the cron endpoint). Expiry status is computed at read time from `expiry_date`, never stored. A daily cron route scans documents, checks a dedupe log, and sends email via Resend.

**Tech Stack:** Next.js 16, TypeScript, React 19, Tailwind CSS 4, shadcn/radix-ui, @supabase/ssr, @supabase/supabase-js, react-hook-form, zod, resend, date-fns, lucide-react, sonner.

**Spec:** `docs/superpowers/specs/2026-09-27-document-vault-mvp-design.md`

## Global Constraints

- File uploads accept only `application/pdf`, `image/jpeg`, `image/png`, max 10MB — enforced client AND server side.
- Every table with user data has RLS filtering on `auth.uid()`. No table is ever queried with the service-role key except from the cron route.
- Storage bucket `documents` is private. Files are only ever accessed through signed URLs generated server-side for the requesting user.
- Expiry status (`valid` / `expiring_soon` / `expired`) is always computed by `lib/expiry.ts`, never stored as a column.
- One notification per (document_id, recipient, day_offset) — enforced by a unique DB constraint, not just application logic.
- The cron route is protected by a shared secret compared against a header, not left open.
- No document type list is duplicated — it lives once in `lib/constants.ts` and both the form and validation schema import it.

---

### Task 1: Scaffold Next.js project

**Files:**
- Create: entire Next.js project root (`package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`)
- Create: `.gitignore`, `.env.example`

**Interfaces:**
- Produces: a running `npm run dev` Next.js app at project root, Tailwind 4 configured, shadcn initialized so later tasks can `npx shadcn@latest add <component>`.

- [ ] **Step 1: Scaffold with create-next-app**

```bash
cd /Users/madanhk/Downloads/doc-vault
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm --yes
```

If the directory-not-empty prompt appears (because `docs/` and `.git` already exist), confirm to proceed into the existing directory.

- [ ] **Step 2: Verify dev server boots**

Run: `npm run dev -- --port 3100 &` then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100` (expect `200`), then stop the dev server (`kill %1`).

- [ ] **Step 3: Install remaining core dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js react-hook-form @hookform/resolvers zod date-fns lucide-react sonner resend
```

- [ ] **Step 4: Initialize shadcn**

```bash
npx shadcn@latest init -d
```

Accept defaults (this creates `components.json`, `lib/utils.ts`, and wires `app/globals.css`).

- [ ] **Step 5: Replace theme tokens in `app/globals.css`**

Open the generated `app/globals.css` and replace the `:root` and `.dark` color blocks with the calm-neutral tokens from the reference project (same values, so the app matches the expense tracker's look):

```css
:root {
  --radius: 0.75rem;

  --background: oklch(0.968 0.002 250);
  --foreground: oklch(0.18 0.006 260);

  --card: oklch(1 0 0);
  --card-foreground: oklch(0.18 0.006 260);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.18 0.006 260);

  --primary: oklch(0.21 0.006 260);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.955 0.002 250);
  --secondary-foreground: oklch(0.28 0.006 260);
  --muted: oklch(0.955 0.002 250);
  --muted-foreground: oklch(0.55 0.008 260);
  --accent: oklch(0.95 0.002 250);
  --accent-foreground: oklch(0.25 0.006 260);

  --destructive: oklch(0.58 0.2 25);
  --destructive-foreground: oklch(0.99 0 0);
  --success: oklch(0.6 0.15 155);
  --warning: oklch(0.72 0.15 70);

  --border: oklch(0.9 0.003 260);
  --input: oklch(0.88 0.004 260);
  --ring: oklch(0.55 0.02 260 / 0.35);
}
```

Add matching `--color-success` and `--color-warning` entries to the `@theme inline` block if the shadcn init didn't already include them, so `bg-success`, `text-warning` etc. are usable as Tailwind classes.

- [ ] **Step 6: Add `.env.example`**

```bash
cat > .env.example <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
CRON_SECRET=
EOF
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Tailwind, shadcn, and theme tokens"
```

---

### Task 2: Supabase client helpers and auth middleware

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`
- Create: `app/auth/callback/route.ts`

**Interfaces:**
- Produces: `createClient()` (browser, from `lib/supabase/client.ts`), `createClient()` (server, async, from `lib/supabase/server.ts`, cookie-aware for Server Components/Actions), `updateSession(request: NextRequest): Promise<NextResponse>` (from `lib/supabase/middleware.ts`), used by root `middleware.ts`.

- [ ] **Step 1: Browser client**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Server client**

```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component; middleware refreshes the session instead
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Middleware session refresh helper**

```typescript
// lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAppRoute = request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/documents") ||
    request.nextUrl.pathname.startsWith("/settings");

  if (!user && isAppRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
```

- [ ] **Step 4: Root middleware**

```typescript
// middleware.ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 5: Auth callback route (for email confirmation links)**

```typescript
// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

- [ ] **Step 6: Verify build compiles**

Run: `npm run build`
Expected: build succeeds (Supabase env vars are read at request time, not build time, so missing `.env.local` values don't fail the build).

- [ ] **Step 7: Commit**

```bash
git add lib/supabase middleware.ts app/auth
git commit -m "feat: add Supabase client helpers and auth middleware"
```

---

### Task 3: Database schema and storage bucket migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: tables `documents`, `notification_recipients`, `notification_logs` with RLS, and a private `documents` storage bucket with owner-scoped policies. All later query/action code depends on these exact column names.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0001_init.sql

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  doc_number text,
  holder_name text,
  issue_date date,
  expiry_date date,
  file_path text not null,
  notes text,
  tags text[] not null default '{}',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_user_id_idx on documents(user_id);
create index documents_expiry_date_idx on documents(expiry_date) where not archived;

create table notification_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, email)
);

create table notification_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  recipient text not null,
  day_offset int not null,
  sent_at timestamptz not null default now(),
  status text not null default 'sent',
  unique (document_id, recipient, day_offset)
);

alter table documents enable row level security;
alter table notification_recipients enable row level security;
alter table notification_logs enable row level security;

create policy "documents_owner_all" on documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notification_recipients_owner_all" on notification_recipients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notification_logs_owner_select" on notification_logs
  for select using (
    exists (
      select 1 from documents
      where documents.id = notification_logs.document_id
      and documents.user_id = auth.uid()
    )
  );

-- updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_set_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- storage bucket
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_bucket_owner_select" on storage.objects
  for select using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_bucket_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_bucket_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
```

Note: `notification_logs` has no `insert`/`update`/`delete` policy for regular users — only the service-role key (used by the cron route) writes to it, which bypasses RLS by design.

- [ ] **Step 2: Document how to apply it**

```bash
mkdir -p supabase
cat > supabase/README.md <<'EOF'
Apply migrations against your Supabase project with the Supabase CLI:

  supabase link --project-ref <your-project-ref>
  supabase db push

Or paste the contents of supabase/migrations/0001_init.sql into the
Supabase SQL editor and run it once.
EOF
```

- [ ] **Step 3: Commit**

```bash
git add supabase
git commit -m "feat: add database schema migration with RLS and storage bucket policies"
```

---

### Task 4: Expiry status logic with unit tests

**Files:**
- Create: `lib/expiry.ts`
- Create: `lib/expiry.test.ts`
- Modify: `package.json` (add `vitest`, a `test` script)

**Interfaces:**
- Produces: `type DocumentStatus = "valid" | "expiring_soon" | "expired" | "no_expiry"`, `getDocumentStatus(expiryDate: string | null, today?: Date): DocumentStatus`, `getDaysRemaining(expiryDate: string, today?: Date): number`. Every later task that displays status imports these two functions — do not reimplement the boundary logic elsewhere.

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing tests**

```typescript
// lib/expiry.test.ts
import { describe, expect, it } from "vitest";
import { getDaysRemaining, getDocumentStatus } from "./expiry";

const today = new Date("2026-09-27T00:00:00Z");

describe("getDaysRemaining", () => {
  it("returns 0 when expiry is today", () => {
    expect(getDaysRemaining("2026-09-27", today)).toBe(0);
  });

  it("returns positive days for a future date", () => {
    expect(getDaysRemaining("2026-10-04", today)).toBe(7);
  });

  it("returns negative days for a past date", () => {
    expect(getDaysRemaining("2026-09-20", today)).toBe(-7);
  });
});

describe("getDocumentStatus", () => {
  it("is expired when expiry date is in the past", () => {
    expect(getDocumentStatus("2026-09-26", today)).toBe("expired");
  });

  it("is expiring_soon on the expiry day itself", () => {
    expect(getDocumentStatus("2026-09-27", today)).toBe("expiring_soon");
  });

  it("is expiring_soon exactly 7 days out", () => {
    expect(getDocumentStatus("2026-10-04", today)).toBe("expiring_soon");
  });

  it("is valid at 8 days out", () => {
    expect(getDocumentStatus("2026-10-05", today)).toBe("valid");
  });

  it("is no_expiry when there is no expiry date", () => {
    expect(getDocumentStatus(null, today)).toBe("no_expiry");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/expiry.test.ts`
Expected: FAIL — `lib/expiry.ts` does not exist yet.

- [ ] **Step 4: Implement**

```typescript
// lib/expiry.ts
export type DocumentStatus = "valid" | "expiring_soon" | "expired" | "no_expiry";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getDaysRemaining(expiryDate: string, today: Date = new Date()): number {
  const expiry = startOfUtcDay(new Date(`${expiryDate}T00:00:00Z`));
  const now = startOfUtcDay(today);
  return Math.round((expiry - now) / MS_PER_DAY);
}

export function getDocumentStatus(
  expiryDate: string | null,
  today: Date = new Date()
): DocumentStatus {
  if (!expiryDate) return "no_expiry";

  const daysRemaining = getDaysRemaining(expiryDate, today);

  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 7) return "expiring_soon";
  return "valid";
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/expiry.test.ts`
Expected: PASS, all 8 tests green.

- [ ] **Step 6: Commit**

```bash
git add lib/expiry.ts lib/expiry.test.ts package.json package-lock.json
git commit -m "feat: add expiry status logic with unit tests"
```

---

### Task 5: Document types constant and zod validation schema

**Files:**
- Create: `lib/constants.ts`
- Create: `lib/validations/document.schema.ts`

**Interfaces:**
- Produces: `DOCUMENT_TYPES: readonly string[]` (from `lib/constants.ts`), `documentFormSchema` (zod object) and `type DocumentFormValues = z.infer<typeof documentFormSchema>` (from `lib/validations/document.schema.ts`). The upload form (Task 9) and the server action (Task 6) both import `documentFormSchema` — never redefine field validation elsewhere.

- [ ] **Step 1: Document type constants**

```typescript
// lib/constants.ts
export const DOCUMENT_TYPES = [
  "Driving Licence",
  "Registration Certificate",
  "Passport",
  "Vehicle Insurance",
  "Vehicle Pollution Certificate (PUC)",
  "Vehicle Fitness Certificate",
  "Aadhaar Card",
  "PAN Card",
  "Voter ID",
  "Health Insurance",
  "Life Insurance",
  "Medical Documents",
  "Education Certificates",
  "Professional Certificates",
  "Membership Cards",
  "Government Documents",
  "Rental/Lease Documents",
  "Warranty Documents",
  "Other / Custom Document",
] as const;

export const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
```

- [ ] **Step 2: Zod schema**

```typescript
// lib/validations/document.schema.ts
import { z } from "zod";

export const documentFormSchema = z.object({
  name: z.string().trim().min(1, "Document name is required").max(200),
  type: z.string().trim().min(1, "Document type is required"),
  docNumber: z.string().trim().max(100).optional().or(z.literal("")),
  holderName: z.string().trim().max(200).optional().or(z.literal("")),
  issueDate: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1)).default([]),
});

export type DocumentFormValues = z.infer<typeof documentFormSchema>;
```

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors related to these two new files.

- [ ] **Step 4: Commit**

```bash
git add lib/constants.ts lib/validations
git commit -m "feat: add document type constants and form validation schema"
```

---

### Task 6: Document queries and server actions

**Files:**
- Create: `lib/queries/documents.ts`
- Create: `lib/actions/documents.ts`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Task 2), `getDocumentStatus`/`getDaysRemaining` from `lib/expiry.ts` (Task 4), `documentFormSchema` from `lib/validations/document.schema.ts` (Task 5).
- Produces: `type DocumentRow` (raw DB shape), `type DocumentWithStatus` (`DocumentRow & { status: DocumentStatus; daysRemaining: number | null }`), `getDocuments(): Promise<DocumentWithStatus[]>`, `getDocumentById(id: string): Promise<DocumentWithStatus | null>`, `getSignedFileUrl(filePath: string): Promise<string>` (from `lib/queries/documents.ts`); `createDocument(formData: FormData): Promise<{ error?: string }>`, `updateDocument(id: string, formData: FormData): Promise<{ error?: string }>`, `archiveDocument(id: string): Promise<{ error?: string }>`, `deleteDocument(id: string): Promise<{ error?: string }>` (from `lib/actions/documents.ts`). Later components (dashboard, documents list, detail page, upload form) call only these.

- [ ] **Step 1: Queries**

```typescript
// lib/queries/documents.ts
import { createClient } from "@/lib/supabase/server";
import { getDaysRemaining, getDocumentStatus, type DocumentStatus } from "@/lib/expiry";

export type DocumentRow = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  doc_number: string | null;
  holder_name: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  file_path: string;
  notes: string | null;
  tags: string[];
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type DocumentWithStatus = DocumentRow & {
  status: DocumentStatus;
  daysRemaining: number | null;
};

function withStatus(row: DocumentRow): DocumentWithStatus {
  return {
    ...row,
    status: getDocumentStatus(row.expiry_date),
    daysRemaining: row.expiry_date ? getDaysRemaining(row.expiry_date) : null,
  };
}

export async function getDocuments(): Promise<DocumentWithStatus[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as DocumentRow[]).map(withStatus);
}

export async function getDocumentById(id: string): Promise<DocumentWithStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).single();

  if (error) return null;
  return withStatus(data as DocumentRow);
}

export async function getSignedFileUrl(filePath: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(filePath, 60 * 10);

  if (error || !data) throw new Error(error?.message ?? "Could not create signed URL");
  return data.signedUrl;
}
```

- [ ] **Step 2: Server actions**

```typescript
// lib/actions/documents.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { documentFormSchema } from "@/lib/validations/document.schema";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/constants";

function parseForm(formData: FormData) {
  const raw = {
    name: formData.get("name")?.toString() ?? "",
    type: formData.get("type")?.toString() ?? "",
    docNumber: formData.get("docNumber")?.toString() ?? "",
    holderName: formData.get("holderName")?.toString() ?? "",
    issueDate: formData.get("issueDate")?.toString() ?? "",
    expiryDate: formData.get("expiryDate")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
    tags: (formData.get("tags")?.toString() ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };

  return documentFormSchema.safeParse(raw);
}

export async function createDocument(formData: FormData): Promise<{ error?: string }> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid document details" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "A document file is required" };
  }
  if (!ACCEPTED_FILE_TYPES.includes(file.type as (typeof ACCEPTED_FILE_TYPES)[number])) {
    return { error: "File must be a PDF, JPG, or PNG" };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: "File must be 10MB or smaller" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const filePath = `${user.id}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("documents").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    doc_number: parsed.data.docNumber || null,
    holder_name: parsed.data.holderName || null,
    issue_date: parsed.data.issueDate || null,
    expiry_date: parsed.data.expiryDate || null,
    notes: parsed.data.notes || null,
    tags: parsed.data.tags,
    file_path: filePath,
  });

  if (insertError) {
    await supabase.storage.from("documents").remove([filePath]);
    return { error: insertError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/documents");
  redirect("/documents");
}

export async function updateDocument(id: string, formData: FormData): Promise<{ error?: string }> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid document details" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      doc_number: parsed.data.docNumber || null,
      holder_name: parsed.data.holderName || null,
      issue_date: parsed.data.issueDate || null,
      expiry_date: parsed.data.expiryDate || null,
      notes: parsed.data.notes || null,
      tags: parsed.data.tags,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  redirect(`/documents/${id}`);
}

export async function archiveDocument(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("documents").update({ archived: true }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/documents");
  redirect("/documents");
}

export async function deleteDocument(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: doc } = await supabase.from("documents").select("file_path").eq("id", id).single();
  if (doc?.file_path) {
    await supabase.storage.from("documents").remove([doc.file_path]);
  }

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/documents");
  redirect("/documents");
}
```

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors in `lib/queries/documents.ts` or `lib/actions/documents.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/queries lib/actions
git commit -m "feat: add document queries and server actions"
```

---

### Task 7: Auth pages (login, register)

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/register/page.tsx`
- Create: `lib/actions/auth.ts`
- Create: `lib/validations/auth.schema.ts`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Task 2).
- Produces: `login(formData: FormData): Promise<{ error?: string }>`, `register(formData: FormData): Promise<{ error?: string }>`, `logout(): Promise<void>` (from `lib/actions/auth.ts`) — the layout's logout button (Task 8) calls `logout`.

- [ ] **Step 1: Auth schema**

```typescript
// lib/validations/auth.schema.ts
import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
```

- [ ] **Step 2: Auth actions**

```typescript
// lib/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema } from "@/lib/validations/auth.schema";

export async function login(formData: FormData): Promise<{ error?: string }> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function register(formData: FormData): Promise<{ error?: string }> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });
  if (error) return { error: error.message };

  redirect("/login?registered=1");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 3: Add shadcn form primitives**

```bash
npx shadcn@latest add button input label card
```

- [ ] **Step 4: Login page**

```tsx
// app/(auth)/login/page.tsx
import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; error?: string }>;
}) {
  const params = await searchParams;

  async function loginAction(formData: FormData) {
    "use server";
    const result = await login(formData);
    return result;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to Document Vault</CardTitle>
        </CardHeader>
        <CardContent>
          {params.registered && (
            <p className="mb-4 text-sm text-success">Account created. Check your email to confirm, then sign in.</p>
          )}
          <form action={loginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="text-primary underline">Register</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Register page**

```tsx
// app/(auth)/register/page.tsx
import Link from "next/link";
import { register } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  async function registerAction(formData: FormData) {
    "use server";
    return register(formData);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={registerAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <Button type="submit" className="w-full">Create account</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Verify it typechecks and builds**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/\(auth\) lib/actions/auth.ts lib/validations/auth.schema.ts components/ui
git commit -m "feat: add login and register pages with auth server actions"
```

---

### Task 8: App layout — sidebar, bottom nav, topbar

**Files:**
- Create: `components/layout/nav-items.ts`
- Create: `components/layout/sidebar.tsx`
- Create: `components/layout/bottom-nav.tsx`
- Create: `components/layout/topbar.tsx`
- Create: `components/layout/logout-button.tsx`
- Create: `app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `logout` from `lib/actions/auth.ts` (Task 7).
- Produces: the `(app)` route group layout that every page in Tasks 10–14 renders inside. Nav items list here is the single source of truth for navigation links.

- [ ] **Step 1: Shared nav item list**

```typescript
// components/layout/nav-items.ts
import { LayoutDashboard, FileText, Clock, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "My Documents", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
```

(`Clock`/"Expiring Soon" and "Notifications" as standalone nav pages are deferred — expiring documents are reachable via the dashboard's "Upcoming Expiries" section and the documents page filter, per the MVP scope.)

- [ ] **Step 2: Logout button**

```tsx
// components/layout/logout-button.tsx
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOut className="mr-2 size-4" />
        Log out
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Sidebar (desktop/tablet)**

```tsx
// components/layout/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { LogoutButton } from "./logout-button";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 flex-col border-r border-border bg-card p-4 md:flex">
      <div className="mb-8 px-2 text-lg font-semibold">Document Vault</div>
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <LogoutButton />
    </aside>
  );
}
```

- [ ] **Step 4: Bottom nav (mobile)**

```tsx
// components/layout/bottom-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-card md:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 5: Topbar with "+ Add Document" CTA**

```tsx
// components/layout/topbar.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:px-6">
      <div className="text-sm text-muted-foreground">Welcome back</div>
      <Button asChild size="sm">
        <Link href="/documents/new">
          <Plus className="mr-2 size-4" />
          Add Document
        </Link>
      </Button>
    </header>
  );
}
```

- [ ] **Step 6: App layout wiring it together**

```tsx
// app/(app)/layout.tsx
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Topbar } from "@/components/layout/topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col pb-16 md:pb-0">
        <Topbar />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 7: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors (pages referencing this layout don't exist yet, so this checks in isolation — later tasks confirm end-to-end).

- [ ] **Step 8: Commit**

```bash
git add components/layout "app/(app)/layout.tsx"
git commit -m "feat: add app shell with sidebar, bottom nav, and topbar"
```

---

### Task 9: Add Document flow — upload form

**Files:**
- Create: `components/documents/document-form.tsx`
- Create: `app/(app)/documents/new/page.tsx`

**Interfaces:**
- Consumes: `createDocument` from `lib/actions/documents.ts` (Task 6), `DOCUMENT_TYPES`/`ACCEPTED_FILE_TYPES`/`MAX_FILE_SIZE_BYTES` from `lib/constants.ts` (Task 5).
- Produces: `<DocumentForm mode="create" />` component, reused (with `mode="edit"`) by the detail page's edit view in Task 13.

- [ ] **Step 1: Add remaining shadcn primitives**

```bash
npx shadcn@latest add select textarea
```

- [ ] **Step 2: Document form component**

```tsx
// components/documents/document-form.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { DOCUMENT_TYPES, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { DocumentWithStatus } from "@/lib/queries/documents";

type Props = {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  initialValues?: Partial<DocumentWithStatus>;
  requireFile?: boolean;
};

export function DocumentForm({ action, initialValues, requireFile = true }: Props) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function validateFile(file: File | undefined) {
    if (!file) return requireFile ? "A document file is required" : null;
    if (!ACCEPTED_FILE_TYPES.includes(file.type as (typeof ACCEPTED_FILE_TYPES)[number])) {
      return "File must be a PDF, JPG, or PNG";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) return "File must be 10MB or smaller";
    return null;
  }

  function handleSubmit(formData: FormData) {
    const file = formData.get("file") as File | null;
    const error = validateFile(file && file.size > 0 ? file : undefined);
    if (error) {
      setFileError(error);
      return;
    }
    setFileError(null);

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4 max-w-xl">
      {requireFile && (
        <div className="space-y-2">
          <Label htmlFor="file">Document file (PDF, JPG, PNG — max 10MB)</Label>
          <Input id="file" name="file" type="file" accept={ACCEPTED_FILE_TYPES.join(",")} />
          {fileError && <p className="text-sm text-destructive">{fileError}</p>}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Document Name</Label>
        <Input id="name" name="name" defaultValue={initialValues?.name} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Document Type</Label>
        <Select name="type" defaultValue={initialValues?.type}>
          <SelectTrigger id="type">
            <SelectValue placeholder="Select a type" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="docNumber">Document Number</Label>
          <Input id="docNumber" name="docNumber" defaultValue={initialValues?.doc_number ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="holderName">Holder Name</Label>
          <Input id="holderName" name="holderName" defaultValue={initialValues?.holder_name ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="issueDate">Issue / Start Date</Label>
          <Input id="issueDate" name="issueDate" type="date" defaultValue={initialValues?.issue_date ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiryDate">Expiry / End Date</Label>
          <Input id="expiryDate" name="expiryDate" type="date" defaultValue={initialValues?.expiry_date ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input id="tags" name="tags" defaultValue={initialValues?.tags?.join(", ") ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={initialValues?.notes ?? ""} rows={3} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Document"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: New document page**

```tsx
// app/(app)/documents/new/page.tsx
import { createDocument } from "@/lib/actions/documents";
import { DocumentForm } from "@/components/documents/document-form";

export default function NewDocumentPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Add Document</h1>
      <DocumentForm action={createDocument} />
    </div>
  );
}
```

- [ ] **Step 4: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/documents/document-form.tsx "app/(app)/documents/new"
git commit -m "feat: add document upload form and new document page"
```

---

### Task 10: Status badge, document card, dashboard stat card, upcoming expiries

**Files:**
- Create: `components/documents/status-badge.tsx`
- Create: `components/documents/document-card.tsx`
- Create: `components/dashboard/stat-card.tsx`
- Create: `components/dashboard/upcoming-expiries.tsx`

**Interfaces:**
- Consumes: `DocumentStatus` type from `lib/expiry.ts` (Task 4), `DocumentWithStatus` from `lib/queries/documents.ts` (Task 6).
- Produces: `<StatusBadge status={...} />`, `<DocumentCard document={...} />`, `<StatCard label={...} value={...} tone={...} />`, `<UpcomingExpiries documents={...} />` — all consumed by the dashboard (Task 11) and documents list (Task 12) pages.

- [ ] **Step 1: Add shadcn badge**

```bash
npx shadcn@latest add badge
```

- [ ] **Step 2: Status badge**

```tsx
// components/documents/status-badge.tsx
import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/lib/expiry";

const STATUS_LABEL: Record<DocumentStatus, string> = {
  valid: "Valid",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  no_expiry: "No Expiry Tracked",
};

const STATUS_CLASS: Record<DocumentStatus, string> = {
  valid: "bg-success/15 text-success border-success/30",
  expiring_soon: "bg-warning/15 text-warning border-warning/30",
  expired: "bg-destructive/15 text-destructive border-destructive/30",
  no_expiry: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
```

- [ ] **Step 3: Document card**

```tsx
// components/documents/document-card.tsx
import Link from "next/link";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import type { DocumentWithStatus } from "@/lib/queries/documents";

export function DocumentCard({ document }: { document: DocumentWithStatus }) {
  const daysLabel =
    document.daysRemaining === null
      ? null
      : document.daysRemaining < 0
        ? `Expired ${Math.abs(document.daysRemaining)} days ago`
        : `${document.daysRemaining} day${document.daysRemaining === 1 ? "" : "s"} remaining`;

  return (
    <Link href={`/documents/${document.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{document.name}</div>
                <div className="text-xs text-muted-foreground">{document.type}</div>
              </div>
            </div>
            <StatusBadge status={document.status} />
          </div>
          {document.expiry_date && (
            <div className="text-sm text-muted-foreground">
              Expires: {format(new Date(document.expiry_date), "dd MMM yyyy")}
            </div>
          )}
          {daysLabel && <div className="text-sm font-medium">{daysLabel}</div>}
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 4: Dashboard stat card**

```tsx
// components/dashboard/stat-card.tsx
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "destructive";

const TONE_CLASS: Record<Tone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: Tone;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={cn("mt-1 text-3xl font-semibold", TONE_CLASS[tone])}>{value}</div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Upcoming expiries list**

```tsx
// components/dashboard/upcoming-expiries.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DocumentWithStatus } from "@/lib/queries/documents";

export function UpcomingExpiries({ documents }: { documents: DocumentWithStatus[] }) {
  const upcoming = documents
    .filter((d) => d.daysRemaining !== null)
    .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming Expiries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">No upcoming expiries.</p>
        )}
        {upcoming.map((doc) => (
          <Link
            key={doc.id}
            href={`/documents/${doc.id}`}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent"
          >
            <span className="text-sm font-medium">{doc.name}</span>
            <span className="text-sm text-muted-foreground">
              {(doc.daysRemaining ?? 0) < 0
                ? "Expired"
                : `${doc.daysRemaining} days remaining`}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/documents/status-badge.tsx components/documents/document-card.tsx components/dashboard
git commit -m "feat: add status badge, document card, and dashboard widgets"
```

---

### Task 11: Dashboard page

**Files:**
- Create: `app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getDocuments` from `lib/queries/documents.ts` (Task 6), `StatCard` and `UpcomingExpiries` (Task 10), `DocumentCard` (Task 10).

- [ ] **Step 1: Dashboard page**

```tsx
// app/(app)/dashboard/page.tsx
import { getDocuments } from "@/lib/queries/documents";
import { StatCard } from "@/components/dashboard/stat-card";
import { UpcomingExpiries } from "@/components/dashboard/upcoming-expiries";
import { DocumentCard } from "@/components/documents/document-card";

export default async function DashboardPage() {
  const documents = await getDocuments();

  const counts = {
    total: documents.length,
    valid: documents.filter((d) => d.status === "valid").length,
    expiringSoon: documents.filter((d) => d.status === "expiring_soon").length,
    expired: documents.filter((d) => d.status === "expired").length,
  };

  const recent = documents.slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s the state of your documents.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Documents" value={counts.total} />
        <StatCard label="Valid" value={counts.valid} tone="success" />
        <StatCard label="Expiring Soon" value={counts.expiringSoon} tone="warning" />
        <StatCard label="Expired" value={counts.expired} tone="destructive" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Recent Documents</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet. Add your first one.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {recent.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </div>
        <UpcomingExpiries documents={documents} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks and builds**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors (Supabase calls happen at request time; build succeeds without live env vars).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/dashboard"
git commit -m "feat: add dashboard page with stats, recent documents, and upcoming expiries"
```

---

### Task 12: My Documents page — search, filter, sort

**Files:**
- Create: `components/documents/document-filters.tsx`
- Create: `app/(app)/documents/page.tsx`

**Interfaces:**
- Consumes: `getDocuments` from `lib/queries/documents.ts` (Task 6), `DocumentCard` (Task 10).
- Produces: reads filter/sort/search state from URL search params (`?q=&status=&sort=`) so the page stays a Server Component — `<DocumentFilters />` is a small client component that only updates the URL.

- [ ] **Step 1: Filter bar (client component, URL-driven)**

```tsx
// components/documents/document-filters.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "valid", label: "Valid" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
];

const SORT_OPTIONS = [
  { value: "expiry", label: "Expiry Date" },
  { value: "recent", label: "Recently Added" },
  { value: "name", label: "Name" },
];

export function DocumentFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder="Search by name, type, or holder..."
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => setParam("q", e.target.value)}
        className="sm:max-w-xs"
      />
      <Select defaultValue={searchParams.get("status") ?? "all"} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger className="sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select defaultValue={searchParams.get("sort") ?? "expiry"} onValueChange={(v) => setParam("sort", v)}>
        <SelectTrigger className="sm:w-44"><SelectValue placeholder="Sort by" /></SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 2: Documents page**

```tsx
// app/(app)/documents/page.tsx
import { getDocuments } from "@/lib/queries/documents";
import { DocumentCard } from "@/components/documents/document-card";
import { DocumentFilters } from "@/components/documents/document-filters";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const documents = await getDocuments();

  let filtered = documents;

  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        (d.holder_name ?? "").toLowerCase().includes(q)
    );
  }

  if (params.status && params.status !== "all") {
    filtered = filtered.filter((d) => d.status === params.status);
  }

  const sort = params.sort ?? "expiry";
  filtered = [...filtered].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "recent") return b.created_at.localeCompare(a.created_at);
    // expiry: documents without an expiry date sort last
    if (a.expiry_date === null) return 1;
    if (b.expiry_date === null) return -1;
    return a.expiry_date.localeCompare(b.expiry_date);
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Documents</h1>
      <DocumentFilters />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents match.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify it typechecks and builds**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/documents/document-filters.tsx "app/(app)/documents/page.tsx"
git commit -m "feat: add My Documents page with search, filter, and sort"
```

---

### Task 13: Document detail page — view, edit, archive, delete

**Files:**
- Create: `app/(app)/documents/[id]/page.tsx`
- Create: `app/(app)/documents/[id]/edit/page.tsx`
- Create: `components/documents/document-actions.tsx`

**Interfaces:**
- Consumes: `getDocumentById`, `getSignedFileUrl` from `lib/queries/documents.ts` (Task 6); `updateDocument`, `archiveDocument`, `deleteDocument` from `lib/actions/documents.ts` (Task 6); `<DocumentForm mode="edit">` from Task 9; `<StatusBadge>` from Task 10.

- [ ] **Step 1: Add shadcn dialog and dropdown-menu**

```bash
npx shadcn@latest add dialog dropdown-menu
```

- [ ] **Step 2: Client component for destructive actions with confirmation**

```tsx
// components/documents/document-actions.tsx
"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { archiveDocument, deleteDocument } from "@/lib/actions/documents";

export function DocumentActions({
  id,
  fileUrl,
}: {
  id: string;
  fileUrl: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={fileUrl} target="_blank" rel="noopener noreferrer">View Full Document</a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={fileUrl} download>Download</a>
      </Button>
      <Button variant="outline" size="sm" disabled title="Coming in a later phase">Share</Button>
      <Button variant="outline" size="sm" disabled title="Coming in a later phase">Renew / Replace</Button>
      <Button asChild variant="outline" size="sm">
        <Link href={`/documents/${id}/edit`}>Edit Details</Link>
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Archive</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive this document?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            It will be hidden from your dashboard and document list. You can restore it later from support if needed.
          </p>
          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={() => startTransition(async () => {
                const result = await archiveDocument(id);
                if (result?.error) toast.error(result.error);
              })}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">Delete</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this document permanently?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This removes the file and its record. This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => startTransition(async () => {
                const result = await deleteDocument(id);
                if (result?.error) toast.error(result.error);
              })}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 3: Detail page**

```tsx
// app/(app)/documents/[id]/page.tsx
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getDocumentById, getSignedFileUrl } from "@/lib/queries/documents";
import { StatusBadge } from "@/components/documents/status-badge";
import { DocumentActions } from "@/components/documents/document-actions";
import { Card, CardContent } from "@/components/ui/card";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocumentById(id);
  if (!document) notFound();

  const fileUrl = await getSignedFileUrl(document.file_path);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{document.name}</h1>
          <p className="text-sm text-muted-foreground">{document.type}</p>
        </div>
        <StatusBadge status={document.status} />
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <Field label="Document Number" value={document.doc_number} />
          <Field label="Holder Name" value={document.holder_name} />
          <Field
            label="Issue Date"
            value={document.issue_date ? format(new Date(document.issue_date), "dd MMM yyyy") : null}
          />
          <Field
            label="Expiry Date"
            value={document.expiry_date ? format(new Date(document.expiry_date), "dd MMM yyyy") : null}
          />
          <Field
            label="Days Remaining"
            value={document.daysRemaining !== null ? String(document.daysRemaining) : null}
          />
          {document.notes && <Field label="Notes" value={document.notes} />}
        </CardContent>
      </Card>

      <DocumentActions id={document.id} fileUrl={fileUrl} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
```

- [ ] **Step 4: Edit page (reuses `DocumentForm` in edit mode, no file re-upload)**

```tsx
// app/(app)/documents/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { getDocumentById } from "@/lib/queries/documents";
import { updateDocument } from "@/lib/actions/documents";
import { DocumentForm } from "@/components/documents/document-form";

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocumentById(id);
  if (!document) notFound();

  const updateWithId = updateDocument.bind(null, id);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Edit Document</h1>
      <DocumentForm action={updateWithId} initialValues={document} requireFile={false} />
    </div>
  );
}
```

- [ ] **Step 5: Verify it typechecks and builds**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/documents/[id]" components/documents/document-actions.tsx
git commit -m "feat: add document detail page with view, edit, archive, and delete"
```

---

### Task 14: Settings page — recipients and account

**Files:**
- Create: `lib/queries/recipients.ts`
- Create: `lib/actions/recipients.ts`
- Create: `components/settings/recipients-form.tsx`
- Create: `app/(app)/settings/page.tsx`

**Interfaces:**
- Produces: `getRecipients(): Promise<RecipientRow[]>`, `addRecipient(formData: FormData): Promise<{ error?: string }>`, `removeRecipient(id: string): Promise<{ error?: string }>`, `toggleRecipient(id: string, enabled: boolean): Promise<{ error?: string }>` — the cron route (Task 15) reads `notification_recipients` directly via the service-role client, but shares the same table these actions write to.

- [ ] **Step 1: Recipients query**

```typescript
// lib/queries/recipients.ts
import { createClient } from "@/lib/supabase/server";

export type RecipientRow = {
  id: string;
  user_id: string;
  email: string;
  enabled: boolean;
  created_at: string;
};

export async function getRecipients(): Promise<RecipientRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_recipients")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data as RecipientRow[];
}
```

- [ ] **Step 2: Recipients actions**

```typescript
// lib/actions/recipients.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email("Enter a valid email");

export async function addRecipient(formData: FormData): Promise<{ error?: string }> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notification_recipients")
    .insert({ user_id: user.id, email: parsed.data });

  if (error) return { error: error.message };

  revalidatePath("/settings");
}

export async function removeRecipient(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("notification_recipients").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
}

export async function toggleRecipient(id: string, enabled: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_recipients")
    .update({ enabled })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
}
```

- [ ] **Step 3: Recipients form (client component)**

```tsx
// components/settings/recipients-form.tsx
"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { addRecipient, removeRecipient, toggleRecipient } from "@/lib/actions/recipients";
import type { RecipientRow } from "@/lib/queries/recipients";

export function RecipientsForm({ recipients }: { recipients: RecipientRow[] }) {
  const [isPending, startTransition] = useTransition();

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const result = await addRecipient(formData);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <form action={handleAdd} className="flex gap-2">
        <Input name="email" type="email" placeholder="name@example.com" required className="max-w-xs" />
        <Button type="submit" disabled={isPending}>Add</Button>
      </form>

      <ul className="space-y-2">
        {recipients.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-lg border border-border p-2">
            <span className="text-sm">{r.email}</span>
            <div className="flex items-center gap-3">
              <Switch
                checked={r.enabled}
                onCheckedChange={(checked) =>
                  startTransition(async () => {
                    const result = await toggleRecipient(r.id, checked);
                    if (result?.error) toast.error(result.error);
                  })
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  startTransition(async () => {
                    const result = await removeRecipient(r.id);
                    if (result?.error) toast.error(result.error);
                  })
                }
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
        {recipients.length === 0 && (
          <p className="text-sm text-muted-foreground">No recipients yet. Add one above.</p>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Add shadcn switch, settings page**

```bash
npx shadcn@latest add switch
```

```tsx
// app/(app)/settings/page.tsx
import { createClient } from "@/lib/supabase/server";
import { getRecipients } from "@/lib/queries/recipients";
import { getDocuments } from "@/lib/queries/documents";
import { RecipientsForm } from "@/components/settings/recipients-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [recipients, documents] = await Promise.all([getRecipients(), getDocuments()]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notification Recipients</CardTitle></CardHeader>
        <CardContent>
          <RecipientsForm recipients={recipients} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Storage</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{documents.length} documents stored</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Verify it typechecks and builds**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/queries/recipients.ts lib/actions/recipients.ts components/settings "app/(app)/settings"
git commit -m "feat: add settings page with notification recipient management"
```

---

### Task 15: Email sending and daily expiry-check cron route

**Files:**
- Create: `lib/email.ts`
- Create: `lib/supabase/admin.ts`
- Create: `app/api/cron/check-expiries/route.ts`
- Create: `vercel.json`

**Interfaces:**
- Consumes: `getDaysRemaining` from `lib/expiry.ts` (Task 4).
- Produces: `sendExpiryReminderEmail(params: { to: string; documentName: string; expiryDate: string; daysRemaining: number }): Promise<{ success: boolean; error?: string }>` (from `lib/email.ts`), `createAdminClient()` (service-role client, from `lib/supabase/admin.ts`), and the `GET /api/cron/check-expiries` route.

- [ ] **Step 1: Service-role admin client (server-only, bypasses RLS)**

```typescript
// lib/supabase/admin.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

- [ ] **Step 2: Email sender**

```typescript
// lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const { error } = await resend.emails.send({
      from: "Document Vault <reminders@resend.dev>",
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
```

- [ ] **Step 3: Cron route**

```typescript
// app/api/cron/check-expiries/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDaysRemaining } from "@/lib/expiry";
import { sendExpiryReminderEmail } from "@/lib/email";

export async function GET(request: Request) {
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
```

- [ ] **Step 4: Vercel Cron config**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-expiries",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Note: Vercel's cron invoker sets its own auth; for manual/local testing, call the route with `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-expiries`.

- [ ] **Step 5: Verify it typechecks and builds**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/email.ts lib/supabase/admin.ts app/api/cron vercel.json
git commit -m "feat: add email sending and daily expiry-check cron route"
```

---

### Task 16: Root layout, redirect, toaster, and README

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Create: `README.md`

**Interfaces:**
- Consumes: `Toaster` from `sonner` (already installed in Task 1).

- [ ] **Step 1: Root layout adds the Toaster**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Document Vault",
  description: "Store it once. Never forget when it expires.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Root page redirects to dashboard (middleware sends unauthenticated users to /login)**

```tsx
// app/page.tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
```

- [ ] **Step 3: README with setup instructions**

```bash
cat > README.md <<'EOF'
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
EOF
```

- [ ] **Step 4: Verify full build and test suite**

Run: `npx tsc --noEmit && npm run build && npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/page.tsx README.md
git commit -m "feat: wire up root layout, redirect, and add README"
```

---

## Post-Plan Manual Verification (not automatable without live credentials)

Once a real Supabase project and Resend key are in `.env.local`:

1. Register an account, confirm email, log in.
2. Add a document with an expiry date 3 days from today.
3. Add your own email as a notification recipient in Settings.
4. Confirm the dashboard shows correct counts and the document appears under Upcoming Expiries with "Expiring Soon" status.
5. Manually call the cron route; confirm one email arrives and one `notification_logs` row is inserted.
6. Call the cron route again; confirm no second email is sent (dedupe works).
7. Edit the document's expiry date to next year; confirm status flips to Valid and no reminder fires on the next cron call.
8. Archive a document; confirm it disappears from dashboard/list. Delete a different document; confirm its file is removed from Storage.
