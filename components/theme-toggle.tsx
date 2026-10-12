"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor },
] as const;

/** Round button that flips light ↔ dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "grid size-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent",
        className
      )}
    >
      {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}

/** Light / Dark / Auto segmented picker for Settings. */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((o) => {
        const active = mounted && theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setTheme(o.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors",
              active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
            )}
          >
            <o.icon className="size-5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- theme is only known on the client
  useEffect(() => setMounted(true), []);
  return mounted;
}
