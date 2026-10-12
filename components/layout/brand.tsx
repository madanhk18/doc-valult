import Link from "next/link";
import { LogoArt } from "@/components/brand/logo-art";

export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="overflow-hidden rounded-[10px] shadow-md">
        <LogoArt size={36} />
      </span>
      <span className="text-lg font-bold tracking-tight">Vault</span>
    </Link>
  );
}
