"use client";

import { ChevronDown, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { SavePresetDialog } from "@/components/presets/SavePresetDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteSavedPreset, listSavedPresets } from "@/lib/presets/storage";
import type { ProtocolPreset } from "@/lib/presets/types";
import type { OffsetMode, Series } from "@/lib/types";

/** Whether the user has built out the series beyond a single empty anchor event. */
function hasUserContent(series: Series): boolean {
  if (series.timepoints.length > 1) {
    return true;
  }
  return series.timepoints.some(
    (timepoint) => timepoint.name.trim().length > 0 || timepoint.description.trim().length > 0,
  );
}

type PresetsMenuProps = {
  series: Series;
  offsetMode: OffsetMode;
  onApplyPreset: (preset: ProtocolPreset) => void;
};

export function PresetsMenu({ series, offsetMode, onApplyPreset }: PresetsMenuProps) {
  const [savedPresets, setSavedPresets] = useState(() => listSavedPresets());
  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<ProtocolPreset | null>(null);

  useEffect(() => {
    if (open) {
      setSavedPresets(listSavedPresets());
    }
  }, [open]);

  const handleApply = (preset: ProtocolPreset) => {
    setOpen(false);
    if (hasUserContent(series)) {
      setPendingPreset(preset);
      return;
    }
    onApplyPreset(preset);
  };

  const handleConfirmApply = () => {
    if (pendingPreset) {
      onApplyPreset(pendingPreset);
    }
    setPendingPreset(null);
  };

  const handleSaved = () => {
    setSavedPresets(listSavedPresets());
  };

  const handleDelete = (presetId: string) => {
    deleteSavedPreset(presetId);
    setSavedPresets(listSavedPresets());
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="toolbar" className="text-[#6b6b74]">
            Presets
            <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
          <DropdownMenuItem onSelect={() => setSaveOpen(true)}>
            Save current series as preset
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {savedPresets.length === 0 ? (
            <DropdownMenuItem disabled>No saved presets yet</DropdownMenuItem>
          ) : (
            savedPresets.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                className="group flex items-center gap-1 pr-1"
                onSelect={() => handleApply(preset)}
              >
                <span className="min-w-0 flex-1 truncate">{preset.name}</span>
                <button
                  type="button"
                  aria-label={`Delete ${preset.name}`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#a8adb5] opacity-0 transition-opacity duration-spring-moderate hover:bg-[#f0f0eb] hover:text-[#6b6b74] group-hover:opacity-100 group-focus:opacity-100"
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(preset.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SavePresetDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        series={series}
        offsetMode={offsetMode}
        onSaved={handleSaved}
      />

      <Dialog open={pendingPreset !== null} onOpenChange={(next) => !next && setPendingPreset(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Apply &ldquo;{pendingPreset?.name}&rdquo; to this series?</DialogTitle>
            <DialogDescription>
              This replaces the current series&apos; events with the preset&apos;s structure. Your
              existing events in this series will be overwritten. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPendingPreset(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmApply}>
              Apply preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
