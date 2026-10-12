import { FolderOpen, LayoutDashboard, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/** `/documents/new` belongs to the + button, not the Documents tab. */
export function isNavActive(pathname: string, href: string): boolean {
  if (pathname === "/documents/new") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
