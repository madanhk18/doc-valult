"use client";

import { useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { addRecipient, removeRecipient, toggleRecipient } from "@/lib/actions/recipients";
import type { RecipientRow } from "@/lib/queries/recipients";

export function RecipientsForm({ recipients }: { recipients: RecipientRow[] }) {
  const [isPending, startTransition] = useTransition();

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await addRecipient(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        form.reset();
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
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
