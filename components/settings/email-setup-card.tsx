"use client";

import { useState, useTransition } from "react";
import { CircleCheck, CircleX, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { checkMyDocumentsNow, sendTestEmail } from "@/lib/actions/email";
import type { EmailSetupCheck } from "@/lib/email-setup";

type Outcome = { tone: "good" | "bad" | "info"; title: string; detail?: string };

export function EmailSetupCard({ checks, email }: { checks: EmailSetupCheck[]; email: string }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [isPending, startTransition] = useTransition();
  const allOk = checks.every((c) => c.ok);

  function test() {
    startTransition(async () => {
      const result = await sendTestEmail();
      if (!result.ok) {
        setOutcome({ tone: "bad", title: `Not sent: ${result.error}`, detail: result.hint });
        toast.error("Test email failed");
      } else {
        setOutcome({
          tone: "good",
          title: `Sent to ${result.to}`,
          detail: "Check your inbox (and spam) in a minute.",
        });
        toast.success("Test email sent");
      }
    });
  }

  function checkNow() {
    startTransition(async () => {
      const result = await checkMyDocumentsNow();
      if (!result.ok) {
        setOutcome({ tone: "bad", title: result.error, detail: result.hint });
        return;
      }
      const { run } = result;
      if (run.failed > 0) {
        setOutcome({
          tone: "bad",
          title: `${run.failed} reminder${run.failed === 1 ? "" : "s"} failed: ${run.errors[0] ?? "unknown error"}`,
          detail: result.hint,
        });
      } else if (run.sent > 0) {
        setOutcome({ tone: "good", title: `Sent ${run.sent} reminder${run.sent === 1 ? "" : "s"}` });
      } else {
        setOutcome({
          tone: "info",
          title: "Nothing due today",
          detail:
            run.skipped > 0
              ? "Today's reminders already went out."
              : "No document is on one of your reminder days today.",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.id} className="flex gap-3 rounded-2xl bg-muted/60 p-3">
            {c.ok ? (
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" />
            ) : (
              <CircleX className="mt-0.5 size-5 shrink-0 text-destructive" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium">{c.label}</p>
              {!c.ok && <p className="mt-0.5 text-xs text-muted-foreground">{c.fix}</p>}
            </div>
          </li>
        ))}
      </ul>

      {!allOk && (
        <p className="text-xs text-muted-foreground">
          After changing environment variables in Vercel, redeploy so they take effect.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="brand" onClick={test} disabled={isPending}>
          <Send className="size-4" />
          Send test email
        </Button>
        <Button variant="outline" onClick={checkNow} disabled={isPending}>
          <RefreshCw className="size-4" />
          Check my documents now
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">The test goes to {email}.</p>

      {outcome && (
        <div
          className={
            outcome.tone === "good"
              ? "rounded-2xl bg-success/12 p-3 text-sm text-success"
              : outcome.tone === "bad"
                ? "rounded-2xl bg-destructive/10 p-3 text-sm text-destructive"
                : "rounded-2xl bg-info/12 p-3 text-sm text-info"
          }
        >
          <p className="font-semibold">{outcome.title}</p>
          {outcome.detail && <p className="mt-1 text-foreground/80">{outcome.detail}</p>}
        </div>
      )}
    </div>
  );
}
