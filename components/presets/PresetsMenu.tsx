"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { SavePresetDialog } from "@/components/presets/SavePresetDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listSavedPresets } from "@/lib/presets/storage";
import type { ProtocolPreset } from "@/lib/presets/types";
import type { OffsetMode, Series } from "@/lib/types";

type PresetsMenuProps = {
  series: Series;
  offsetMode: OffsetMode;
  onApplyPreset: (preset: ProtocolPreset) => void;
};

export function PresetsMenu({ series, offsetMode, onApplyPreset }: PresetsMenuProps) {
  const [savedPresets, setSavedPresets] = useState(() => listSavedPresets());
  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setSavedPresets(listSavedPresets());
    }
  }, [open]);

  const handleApply = (preset: ProtocolPreset) => {
    onApplyPreset(preset);
    setOpen(false);
  };

  const handleSaved = () => {
    setSavedPresets(listSavedPresets());
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="toolbar">
            Presets
            <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
          <DropdownMenuItem onSelect={() => setSaveOpen(true)}>Save preset</DropdownMenuItem>
          <DropdownMenuSeparator />
          {savedPresets.length === 0 ? (
            <DropdownMenuItem disabled>No saved presets</DropdownMenuItem>
          ) : (
            savedPresets.map((preset) => (
              <DropdownMenuItem key={preset.id} onSelect={() => handleApply(preset)}>
                {preset.name}
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
    </>
  );
}
