import { ChevronDown } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
import type { OffsetMode } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type OffsetModeToggleProps = {
  value: OffsetMode;
  onChange: (mode: OffsetMode) => void;
};

const OPTIONS: Array<{ value: OffsetMode; label: string }> = [
  { value: "from-start", label: "Relative to first event" },
  { value: "from-previous", label: "Relative to previous event" },
  { value: "custom", label: "Custom" },
];

export function OffsetModeToggle({ value, onChange }: OffsetModeToggleProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as OffsetMode)}>
      <SelectPrimitive.Trigger
        className={cn(
          "inline-flex h-6 w-fit items-center gap-1 rounded-[3px] bg-[#f0f0eb] px-2 text-[11px] font-normal text-[#6b6b74] outline-none hover:bg-[#ebebe5] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#c6c8cf]",
        )}
        aria-label="Offset mode"
      >
        <SelectValue />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectContent align="start" className="min-w-[10rem]">
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-[12px]">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
