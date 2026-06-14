"use client";

import { Check } from "lucide-react";
import { GOOGLE_CALENDAR_EVENT_COLORS } from "@/lib/googleCalendarColors";
import { cn } from "@/lib/utils";

type SeriesColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export function SeriesColorPicker({ value, onChange }: SeriesColorPickerProps) {
  return (
    <div
      className="grid grid-cols-6 gap-2"
      role="listbox"
      aria-label="Series color"
    >
      {GOOGLE_CALENDAR_EVENT_COLORS.map((color) => {
        const isSelected = color.value.toLowerCase() === value.toLowerCase();
        const isLightSwatch = color.id === "8";

        return (
          <button
            key={color.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            aria-label={color.name}
            title={color.name}
            onClick={() => onChange(color.value)}
            className={cn(
              "relative flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-spring-fast hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161616] focus-visible:ring-offset-2",
              isLightSwatch && "border border-[#e3e3e3]",
            )}
            style={{ backgroundColor: color.value }}
          >
            {isSelected ? (
              <Check
                className={cn(
                  "h-3.5 w-3.5",
                  isLightSwatch || color.id === "5" ? "text-[#161616]" : "text-white",
                )}
                strokeWidth={3}
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
