import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-9 rounded-xl [&_svg]:size-4",
  md: "size-11 rounded-2xl [&_svg]:size-5",
  lg: "size-14 rounded-2xl [&_svg]:size-7",
} as const;

/** A coloured icon on a soft tint of the same colour. `solid` fills it instead. */
export function IconChip({
  icon: Icon,
  color,
  size = "md",
  solid = false,
  className,
}: {
  icon: LucideIcon;
  color: string;
  size?: keyof typeof SIZES;
  solid?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center", SIZES[size], className)}
      style={
        solid
          ? { backgroundColor: color, color: "#fff" }
          : { backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`, color }
      }
    >
      <Icon strokeWidth={2.2} />
    </span>
  );
}
