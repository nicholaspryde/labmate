"use client";

import { useState } from "react";
import { AppNavigationProvider } from "@/components/app-navigation-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ExperimentPanelSlotContext } from "@/components/workspace/workspace-chrome-context";

type AppShellProps = {
  children: React.ReactNode;
};

function AppShellLayout({ children }: AppShellProps) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);

  return (
    <SidebarProvider>
      <AppSidebar />
      {/* slot for ExperimentPanel — portalled here from TimepointCalendarApp */}
      <div ref={setSlot} className="hidden shrink-0 md:block md:w-60" />
      <SidebarInset className="flex min-h-svh flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-medium">Labmate</span>
        </header>
        <ExperimentPanelSlotContext.Provider value={slot}>
          {children}
        </ExperimentPanelSlotContext.Provider>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <AppNavigationProvider>
      <AppShellLayout>{children}</AppShellLayout>
    </AppNavigationProvider>
  );
}
