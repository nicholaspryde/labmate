"use client";

import { Loader2 } from "lucide-react";
import type { BadgeState } from "@/hooks/use-calendar-sync";
import { cn } from "@/lib/utils";

type SyncBadgeProps = {
  state: BadgeState;
  lastPublishedAt: string | null;
  onClick?: () => void;
  className?: string;
};

function formatTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SyncBadge({ state, lastPublishedAt, onClick, className }: SyncBadgeProps) {
  if (state === "hidden") {
    return null;
  }

  const timestamp = formatTimestamp(lastPublishedAt);
  const clickable = state === "unsynced" || state === "ready" || state === "error" || state === "queued";

  const label =
    state === "synced"
      ? timestamp
        ? `Synced · ${timestamp}`
        : "Synced"
      : state === "unsynced"
        ? "Unsynced changes"
        : state === "ready"
          ? "Ready to publish"
          : state === "syncing"
            ? "Syncing…"
            : state === "error"
              ? "Sync failed"
              : "Queued";

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
        state === "synced" && "bg-[#e8f5eb] text-[#1a5232]",
        (state === "unsynced" || state === "ready") && "bg-[#fff4df] text-[#7a4d00] hover:bg-[#ffe8bf]",
        state === "syncing" && "bg-[#eef2ff] text-[#334155]",
        state === "error" && "bg-[#fdecec] text-[#9b1c1c] hover:bg-[#fcd9d9]",
        state === "queued" && "bg-[#f3f4f6] text-[#4b5563] hover:bg-[#e5e7eb]",
        !clickable && "cursor-default",
        className,
      )}
    >
      {state === "syncing" ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
      <span>{label}</span>
    </button>
  );
}
