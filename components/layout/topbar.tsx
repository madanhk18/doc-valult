import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:px-6">
      <div className="text-sm text-muted-foreground">Welcome back</div>
      <Button size="sm" render={<Link href="/documents/new" />}>
        <Plus className="mr-2 size-4" />
        Add Document
      </Button>
    </header>
  );
}
