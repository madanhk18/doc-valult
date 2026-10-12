"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { REMINDER_DAY_OPTIONS } from "@/lib/expiry";
import { saveReminderDays } from "@/lib/actions/reminders";
import { cn } from "@/lib/utils";

function label(day: number) {
  if (day === 0) return "On the day";
  if (day === 1) return "1 day before";
  return `${day} days before`;
}

export function ReminderDaysForm({ initialDays, migrated }: { initialDays: number[]; migrated: boolean }) {
  const [days, setDays] = useState<number[]>(initialDays);
  const [isPending, startTransition] = useTransition();
  const dirty = [...days].sort().join() !== [...initialDays].sort().join();

  function toggle(day: number) {
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));
  }

  function save() {
    startTransition(async () => {
      const result = await saveReminderDays(days);
      if (result.error) toast.error(result.error);
      else toast.success(days.length === 0 ? "Reminders turned off" : "Reminder days saved");
    });
  }

  return (
    <div className="space-y-4">
      {!migrated && (
        <p className="rounded-2xl bg-warning/12 p-3 text-sm text-warning">
          Run <code className="font-mono">supabase/migrations/0002_reminders.sql</code> in Supabase to save your own
          days. Until then the defaults below are used.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {REMINDER_DAY_OPTIONS.map((day) => {
          const active = days.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              aria-pressed={active}
              className={cn(
                "rounded-2xl border px-3 py-3 text-sm font-semibold transition-colors",
                active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:bg-accent"
              )}
            >
              {label(day)}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {days.length === 0
          ? "No days picked — reminders are off."
          : "Added a document late? You still get one reminder straight away, then on the days you picked."}
      </p>
      <Button onClick={save} disabled={!dirty || isPending || !migrated} className="w-full sm:w-auto">
        {isPending ? "Saving…" : "Save reminder days"}
      </Button>
    </div>
  );
}
