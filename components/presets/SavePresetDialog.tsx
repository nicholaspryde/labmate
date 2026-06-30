"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { seriesToPreset } from "@/lib/presets/serialize";
import { savePreset } from "@/lib/presets/storage";
import { computeDisplayOffsetMinutes, fromTotalMinutes } from "@/lib/timepointMath";
import type { OffsetMode, Series } from "@/lib/types";

type SavePresetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  series: Series;
  offsetMode: OffsetMode;
  onSaved?: () => void;
};

function offsetModeLabel(mode: OffsetMode): string {
  if (mode === "from-start") return "Relative to first event";
  if (mode === "from-previous") return "Relative to previous event";
  return "Custom offsets";
}

function formatOffsetMinutes(totalMinutes: number): string {
  const { days, hours, minutes } = fromTotalMinutes(totalMinutes);
  const parts: string[] = [];

  if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);

  return parts.length > 0 ? parts.join(" ") : "0 minutes";
}

export function SavePresetDialog({
  open,
  onOpenChange,
  series,
  offsetMode,
  onSaved,
}: SavePresetDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setName(series.name.trim() || "Untitled preset");
    }
  }, [open, series.name]);

  const previewItems = useMemo(
    () =>
      series.timepoints.map((timepoint, index) => ({
        index: index + 1,
        label: timepoint.name.trim() || `Event ${index + 1}`,
        offsetLabel:
          index === 0 ? "Anchor" : `+ ${formatOffsetMinutes(computeDisplayOffsetMinutes(series, index, offsetMode))}`,
      })),
    [series, offsetMode],
  );

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    savePreset(seriesToPreset(series, offsetMode, trimmed));
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save preset</DialogTitle>
          <DialogDescription>
            Save this protocol as a reusable template. Calendar dates are not included.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Preset name"
          aria-label="Preset name"
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter" && name.trim()) {
              handleSave();
            }
          }}
        />

        <div className="rounded-md border bg-[#fafaf8] p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Preview · {offsetModeLabel(offsetMode)}
          </p>
          <ul className="space-y-1.5">
            {previewItems.map((item) => (
              <li key={item.index} className="flex items-baseline gap-2 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#dfe8ff] text-[10px] font-medium text-[#4c69b3]">
                  {item.index}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{item.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{item.offsetLabel}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!name.trim()}>
            Save preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
