"use client";

import { ChevronDown, Clock } from "lucide-react";
import { useState } from "react";
import type { OffsetMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type OffsetModeToggleProps = {
  value: OffsetMode;
  onChange: (mode: OffsetMode) => void;
};

const OPTIONS: Array<{
  value: OffsetMode;
  label: string;
  description: string;
  shortLabel: string;
}> = [
  {
    value: "from-start",
    label: "First event",
    description: "All events in relation to the first one",
    shortLabel: "From first event",
  },
  {
    value: "from-previous",
    label: "Previous event",
    description: "All events in relation to the previous one",
    shortLabel: "From previous event",
  },
  {
    value: "custom",
    label: "I'll choose per event",
    description: "Custom spacing between events",
    shortLabel: "Custom per event",
  },
];

export function OffsetModeToggle({ value, onChange }: OffsetModeToggleProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];

  const handleSelect = (mode: OffsetMode) => {
    onChange(mode);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="toolbar" className="gap-1.5 px-2" aria-label="Offset mode">
          <Clock className="size-3 shrink-0 text-[#161616]" aria-hidden />
          {selectedOption.shortLabel}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(calc(100vw-2rem),20rem)] rounded-xl p-3">
        <p id="offset-mode-label" className="mb-2 text-[13px] font-normal text-[#6b6b74]">
          When I say &ldquo;+3 days,&rdquo; I mean 3 days after&hellip;
        </p>
        <div role="radiogroup" aria-labelledby="offset-mode-label" className="flex flex-col gap-2">
          {OPTIONS.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "flex cursor-pointer flex-col items-start rounded-[10px] border px-3 py-2.5 text-left transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004cff]/40 focus-visible:ring-offset-1",
                  isSelected
                    ? "border-[#004cff] bg-[#dfe8ff]"
                    : "border-[#e3e3e3] bg-white hover:border-[#d4d4d4] hover:bg-[#fafaf8]",
                )}
              >
                <span
                  className={cn(
                    "text-[13px] font-medium leading-snug",
                    isSelected ? "text-[#082872]" : "text-[#161616]",
                  )}
                >
                  {option.label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-[12px] leading-snug",
                    isSelected ? "text-[#082872]" : "text-[#6b6b74]",
                  )}
                >
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
