import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Topbar } from "@/components/layout/topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col pb-16 md:pb-0">
        <Topbar />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
