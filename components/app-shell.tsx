"use client";

import { useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ExperimentPanelSlotContext } from "@/components/workspace/workspace-chrome-context";

type AppShellProps = {
  children: React.ReactNode;
};

function AppShellLayout({ children }: AppShellProps) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);

  return (
    <SidebarProvider>
      {/* slot for ExperimentPanel — portalled here from TimepointCalendarApp */}
      <div ref={setSlot} className="hidden shrink-0 md:block md:w-60" />
      <SidebarInset className="flex min-h-svh flex-col">
        <ExperimentPanelSlotContext.Provider value={slot}>
          {children}
        </ExperimentPanelSlotContext.Provider>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppShell({ children }: AppShellProps) {
  return <AppShellLayout>{children}</AppShellLayout>;
}
