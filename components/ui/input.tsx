import * as React from "react";
import { DISABLE_AUTOFILL_INPUT_PROPS } from "@/lib/autofill";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, autoComplete = DISABLE_AUTOFILL_INPUT_PROPS.autoComplete, ...props }, ref) => {
    return (
      <input
        type={type}
        {...DISABLE_AUTOFILL_INPUT_PROPS}
        autoComplete={autoComplete}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
