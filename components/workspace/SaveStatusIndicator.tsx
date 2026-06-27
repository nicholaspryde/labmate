"use client";

import type { SaveStatus } from "@/hooks/use-workspace-sync";

type SaveStatusIndicatorProps = {
  status: SaveStatus;
};

export function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  if (status !== "offline") {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm"
      role="status"
    >
      <span>
        You&apos;re offline. Changes are saved on this device and will sync when you&apos;re back online.
      </span>
    </div>
  );
}
