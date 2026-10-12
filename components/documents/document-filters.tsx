"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_COLOR } from "./status-badge";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "all", label: "All", color: "var(--primary)" },
  { value: "expiring_soon", label: "Expiring soon", color: STATUS_COLOR.expiring_soon },
  { value: "expired", label: "Expired", color: STATUS_COLOR.expired },
  { value: "valid", label: "Valid", color: STATUS_COLOR.valid },
  { value: "no_expiry", label: "No expiry", color: STATUS_COLOR.no_expiry },
] as const;

const SORT_OPTIONS = [
  { value: "expiry", label: "Expiry date" },
  { value: "recent", label: "Recently added" },
  { value: "name", label: "Name" },
];

export function DocumentFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "all";

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search name, type or holder"
            defaultValue={searchParams.get("q") ?? ""}
            onChange={(e) => setParam("q", e.target.value)}
            className="pl-10"
          />
        </div>
        <Select defaultValue={searchParams.get("sort") ?? "expiry"} onValueChange={(v) => setParam("sort", v as string)}>
          <SelectTrigger className="w-36 shrink-0" aria-label="Sort by">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
        {STATUS_OPTIONS.map((o) => {
          const active = status === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setParam("status", o.value)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active ? "border-transparent text-white shadow-sm" : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
              style={active ? { backgroundColor: o.color } : undefined}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
