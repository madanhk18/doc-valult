"use client";

import { useTransition, type FormEvent } from "react";
import { Mail, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { addRecipient, removeRecipient, toggleRecipient } from "@/lib/actions/recipients";
import type { RecipientRow } from "@/lib/queries/recipients";

export function RecipientsForm({ recipients, accountEmail }: { recipients: RecipientRow[]; accountEmail: string }) {
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
        toast.success("Recipient added");
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input name="email" type="email" placeholder="family@example.com" required />
        <Button type="submit" disabled={isPending} className="h-11 shrink-0">
          <Plus className="size-4" />
          Add
        </Button>
      </form>

      <ul className="space-y-2">
        {recipients.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3">
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <Mail className="size-4 shrink-0 text-primary" />
              <span className="truncate">{r.email}</span>
            </span>
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
                size="icon-sm"
                aria-label={`Remove ${r.email}`}
                onClick={() =>
                  startTransition(async () => {
                    const result = await removeRecipient(r.id);
                    if (result?.error) toast.error(result.error);
                  })
                }
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
        {recipients.length === 0 && (
          <li className="flex items-center gap-2 rounded-2xl bg-muted/60 p-3 text-sm">
            <Mail className="size-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="font-medium">{accountEmail}</span>
              <span className="text-muted-foreground"> · your login email, used until you add someone</span>
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
