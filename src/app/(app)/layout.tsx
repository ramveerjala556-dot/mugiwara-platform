import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";
import { CommandPalette } from "@/components/command-palette";
import { DemoBanner } from "@/components/dashboard/demo-banner";
import { getOptionalUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getOptionalUser();

  return (
    <ToastProvider>
      <TooltipProvider delayDuration={200}>
        <CommandPalette />
        <div className="min-h-screen lg:pl-64">
          <Sidebar />
          <Topbar email={user?.email} fullName={user?.fullName} avatarUrl={user?.avatarUrl} />
          {!isSupabaseConfigured && <DemoBanner />}
          <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">{children}</main>
        </div>
      </TooltipProvider>
    </ToastProvider>
  );
}
