"use client";

import { Button } from "@/components/ui/button";
import type { SaveStatus } from "@/hooks/use-workspace-sync";
import { cn } from "@/lib/utils";

type SaveStatusIndicatorProps = {
  status: SaveStatus;
  signedIn: boolean;
  onRetry: () => void;
};

export function SaveStatusIndicator({ status, signedIn, onRetry }: SaveStatusIndicatorProps) {
  if (status === "idle") {
    return null;
  }

  const label =
    status === "saving"
      ? signedIn
        ? "Saving to cloud..."
        : "Saving locally..."
      : status === "saved"
        ? signedIn
          ? "Saved to cloud"
          : "Saved locally"
        : "Save failed";

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm",
        status === "error" && "text-destructive",
      )}
      role="status"
    >
      <span>{label}</span>
      {status === "error" ? (
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
