import { ThemeToggle } from "@/components/theme-toggle";
import { Brand } from "./brand";

export function Topbar() {
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl md:border-none md:bg-transparent md:backdrop-blur-none">
      <div className="flex items-center justify-between px-4 py-3 md:px-8 md:py-5">
        <div className="md:hidden">
          <Brand />
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
