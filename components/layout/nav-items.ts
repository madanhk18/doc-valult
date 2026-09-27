import { LayoutDashboard, FileText, Clock, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "My Documents", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
