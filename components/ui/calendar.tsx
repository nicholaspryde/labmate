"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames, type DayButtonProps } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: DayButtonProps) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) {
      ref.current?.focus();
    }
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "size-8 p-0 font-normal aria-selected:opacity-100",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
        "data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground",
        "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground",
        "data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50",
        defaultClassNames.day_button,
        className,
      )}
      {...props}
    />
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:2rem]",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 opacity-50 hover:opacity-100",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 opacity-50 hover:opacity-100",
          defaultClassNames.button_next,
        ),
        month_caption: cn("flex h-8 w-full items-center justify-center px-8", defaultClassNames.month_caption),
        caption_label: cn("text-sm font-medium", defaultClassNames.caption_label),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground",
          defaultClassNames.weekday,
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        day: cn("relative aspect-square h-full w-full p-0 text-center select-none", defaultClassNames.day),
        today: cn("rounded-md bg-accent text-accent-foreground", defaultClassNames.today),
        outside: cn("text-[#c5c8cd]", defaultClassNames.outside),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className={cn("size-4", className)} {...chevronProps} />;
        },
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
