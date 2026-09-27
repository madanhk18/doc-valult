"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "valid", label: "Valid" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
];

const SORT_OPTIONS = [
  { value: "expiry", label: "Expiry Date" },
  { value: "recent", label: "Recently Added" },
  { value: "name", label: "Name" },
];

export function DocumentFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder="Search by name, type, or holder..."
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => setParam("q", e.target.value)}
        className="sm:max-w-xs"
      />
      <Select defaultValue={searchParams.get("status") ?? "all"} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger className="sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select defaultValue={searchParams.get("sort") ?? "expiry"} onValueChange={(v) => setParam("sort", v)}>
        <SelectTrigger className="sm:w-44"><SelectValue placeholder="Sort by" /></SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
