"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={500}>
        {children}
        <Toaster position="bottom-center" />
      </TooltipProvider>
    </AuthProvider>
  );
}
