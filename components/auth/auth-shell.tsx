import { BellRing, Lock, ShieldCheck } from "lucide-react";
import { LogoArt } from "@/components/brand/logo-art";

/** Gradient backdrop + card shared by the sign-in and sign-up pages. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand px-4 py-10">
      <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-fuchsia-300/25 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <span className="overflow-hidden rounded-[18px] shadow-xl ring-4 ring-white/20">
            <LogoArt size={64} />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Document Vault</h1>
          <p className="mt-1 text-sm text-white/80">Store it once. Never forget when it expires.</p>
        </div>

        <div className="rounded-[28px] bg-card p-6 text-card-foreground shadow-2xl">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>

        <ul className="mt-6 flex justify-center gap-5 text-xs font-medium text-white/85">
          <li className="flex items-center gap-1.5"><Lock className="size-3.5" /> Private</li>
          <li className="flex items-center gap-1.5"><BellRing className="size-3.5" /> Reminders</li>
          <li className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> Secure</li>
        </ul>
      </div>
    </div>
  );
}
