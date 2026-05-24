import type { OffsetMode } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type OffsetModeToggleProps = {
  value: OffsetMode;
  onChange: (mode: OffsetMode) => void;
};

export function OffsetModeToggle({ value, onChange }: OffsetModeToggleProps) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as OffsetMode)}>
      <TabsList className="grid h-10 w-full grid-cols-2 rounded-[4px] bg-[#f1f3f4] p-1">
        <TabsTrigger
          value="from-start"
          className="rounded-[3px] text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-[#161616]"
        >
          Relative to +0
        </TabsTrigger>
        <TabsTrigger
          value="from-previous"
          className="rounded-[3px] text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-[#161616]"
        >
          Relative to previous
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
