import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      <span className="grid size-16 place-items-center rounded-3xl bg-primary/10 text-primary">
        <Icon className="size-8" strokeWidth={2} />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold">{title}</p>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
