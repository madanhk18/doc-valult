import Link from "next/link";
import { CircleCheck, Clock, FolderPlus, PartyPopper, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { getDocuments } from "@/lib/queries/documents";
import { createClient } from "@/lib/supabase/server";
import { DocumentCard, DocumentRow } from "@/components/documents/document-card";
import { STATUS_COLOR } from "@/components/documents/status-badge";
import { IconChip } from "@/components/shared/icon-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { InstallHint } from "@/components/pwa/install-hint";
import { Button } from "@/components/ui/button";

function firstName(email: string | undefined): string {
  const local = email?.split("@")[0]?.split(/[._+-]/)[0] ?? "";
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "there";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const [documents, { data }] = await Promise.all([getDocuments(), supabase.auth.getUser()]);

  const counts = {
    valid: documents.filter((d) => d.status === "valid").length,
    expiringSoon: documents.filter((d) => d.status === "expiring_soon").length,
    expired: documents.filter((d) => d.status === "expired").length,
  };

  const attention = documents
    .filter((d) => d.status === "expired" || d.status === "expiring_soon")
    .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));
  const attentionIds = new Set(attention.map((d) => d.id));
  // Anything already listed under "Needs attention" isn't repeated here.
  const recent = documents.filter((d) => !attentionIds.has(d.id)).slice(0, 4);

  const tiles = [
    { status: "valid", label: "Valid", count: counts.valid, icon: CircleCheck },
    { status: "expiring_soon", label: "Expiring", count: counts.expiringSoon, icon: Clock },
    { status: "expired", label: "Expired", count: counts.expired, icon: TriangleAlert },
  ] as const;

  return (
    <div className="space-y-6">
      <InstallHint />

      <section className="relative overflow-hidden rounded-[28px] bg-brand p-6 text-white shadow-xl md:p-8">
        <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-fuchsia-300/25 blur-2xl" />
        <p className="relative text-sm font-medium text-white/80">Hi {firstName(data.user?.email)} 👋</p>
        <p className="relative mt-3 text-5xl font-extrabold tracking-tight">{documents.length}</p>
        <p className="relative mt-1 text-white/85">
          document{documents.length === 1 ? "" : "s"} safe in your vault
        </p>
        <Button
          size="sm"
          className="relative mt-5 bg-white text-[var(--brand-1)] hover:bg-white/90"
          render={<Link href="/documents/new" />}
        >
          <FolderPlus className="size-4" />
          Add document
        </Button>
      </section>

      {documents.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Your vault is empty"
          description="Add your driving licence, insurance or passport. We'll remind you before anything expires."
          action={
            <Button variant="brand" render={<Link href="/documents/new" />}>
              Add your first document
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {tiles.map((t) => {
              const color = STATUS_COLOR[t.status];
              return (
                <Link
                  key={t.status}
                  href={`/documents?status=${t.status}`}
                  className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm transition-transform active:scale-[0.98]"
                >
                  <IconChip icon={t.icon} color={color} size="sm" />
                  <div>
                    <p className="text-2xl font-bold tabular-nums" style={{ color: t.count > 0 ? color : undefined }}>
                      {t.count}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">{t.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <section className="rounded-3xl border border-border bg-card p-4 shadow-sm md:p-5">
            <div className="mb-2 flex items-center gap-2.5 px-2">
              <IconChip icon={ShieldAlert} color="var(--warning)" size="sm" />
              <h2 className="font-semibold">Needs attention</h2>
            </div>
            {attention.length === 0 ? (
              <div className="flex items-center gap-3 px-2 py-3 text-sm text-muted-foreground">
                <PartyPopper className="size-5 text-[var(--success)]" />
                All good — nothing expires in the next 30 days.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {attention.map((doc) => (
                  <DocumentRow key={doc.id} document={doc} />
                ))}
              </div>
            )}
          </section>

          {recent.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-semibold">Recently added</h2>
                <Link href="/documents" className="text-sm font-medium text-primary">
                  See all
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {recent.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
