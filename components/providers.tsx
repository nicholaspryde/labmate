"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      {children}
      <Toaster position="bottom-center" />
    </TooltipProvider>
  );
}
