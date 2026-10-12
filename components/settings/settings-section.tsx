import type { LucideIcon } from "lucide-react";
import { IconChip } from "@/components/shared/icon-chip";

export function SettingsSection({
  id,
  icon,
  color,
  title,
  description,
  children,
}: {
  id?: string;
  icon: LucideIcon;
  color: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border border-border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-start gap-3">
        <IconChip icon={icon} color={color} size="sm" />
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
