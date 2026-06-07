import * as React from "react";
import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-transparent px-1 font-sans text-xs font-medium text-muted-foreground select-none shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] in-data-[slot=tooltip-content]:text-background in-data-[slot=tooltip-content]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)] [&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
