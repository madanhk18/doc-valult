import { docStyle } from "@/lib/doc-style";
import { IconChip } from "@/components/shared/icon-chip";

export function DocTypeIcon({
  type,
  size = "md",
  solid,
}: {
  type: string;
  size?: "sm" | "md" | "lg";
  solid?: boolean;
}) {
  const { icon, color } = docStyle(type);
  return <IconChip icon={icon} color={color} size={size} solid={solid} />;
}
