"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { NAV_ITEMS, isNavActive } from "./nav-items";
import { cn } from "@/lib/utils";

/** Floating dark dock for phones, with the add button raised in the middle. */
export function BottomNav() {
  const pathname = usePathname();
  const [home, documents, settings] = NAV_ITEMS;

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 px-4 md:hidden">
      <div className="mx-auto mb-3 flex max-w-md items-center justify-around rounded-[28px] bg-[var(--dock)] px-2 py-2 text-[var(--dock-foreground)] shadow-2xl shadow-black/25">
        <Tab item={home} active={isNavActive(pathname, home.href)} />
        <Tab item={documents} active={isNavActive(pathname, documents.href)} />
        <Link
          href="/documents/new"
          aria-label="Add document"
          className="-mt-8 grid size-14 place-items-center rounded-full bg-brand text-white shadow-lg ring-4 ring-background transition-transform active:scale-95"
        >
          <Plus className="size-7" strokeWidth={2.6} />
        </Link>
        <Tab item={settings} active={isNavActive(pathname, settings.href)} />
      </div>
    </nav>
  );
}

function Tab({ item, active }: { item: (typeof NAV_ITEMS)[number]; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-w-16 flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[11px] font-medium transition-colors",
        active ? "text-white" : "text-white/55 hover:text-white/80"
      )}
    >
      <item.icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} />
      {item.label}
    </Link>
  );
}
