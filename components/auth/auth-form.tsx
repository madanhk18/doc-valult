"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({
  action,
  submitLabel,
  passwordMinLength,
}: {
  action: (formData: FormData) => Promise<{ error?: string }>;
  submitLabel: string;
  passwordMinLength?: number;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={passwordMinLength ? "new-password" : "current-password"}
          placeholder="At least 8 characters"
          minLength={passwordMinLength}
          required
        />
      </div>
      <Button type="submit" variant="brand" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Please wait…" : submitLabel}
      </Button>
    </form>
  );
}
