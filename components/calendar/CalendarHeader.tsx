"use client";

import { useIlamyCalendarContext, type CalendarView } from "@ilamy/calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export function CalendarHeader() {
  const { currentDate, view, setView, prevPeriod, nextPeriod, today } =
    useIlamyCalendarContext();

  const monthLabel = currentDate.format("MMMM");
  const yearLabel = currentDate.format("YYYY");

  return (
    <div className="relative flex w-full items-center justify-between gap-4 border-b border-[#e3e3e3] px-4 py-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={today}
          className="h-10 rounded-sm px-4 text-xs font-medium text-[#161616] hover:bg-[#f5f5f5]"
          style={{ letterSpacing: "0.16px" }}
        >
          Today
        </Button>
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous"
            onClick={prevPeriod}
            className="h-10 w-10 rounded-sm text-[#161616] hover:bg-[#f5f5f5]"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next"
            onClick={nextPeriod}
            className="h-10 w-10 rounded-sm text-[#161616] hover:bg-[#f5f5f5]"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <h2
        className={cn(
          "pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[16px] font-medium leading-normal text-[#161616]",
        )}
        style={{ letterSpacing: "-0.24px" }}
      >
        {monthLabel}{" "}
        <span>{yearLabel}</span>
      </h2>

      <Select
        value={VIEW_OPTIONS.some((o) => o.value === view) ? view : "week"}
        onValueChange={(next) => setView(next as CalendarView)}
      >
        <SelectTrigger
          className="h-10 w-auto gap-2 rounded-sm border-0 bg-transparent px-4 py-2 text-xs font-medium text-[#161616] focus:ring-0"
          style={{ letterSpacing: "0.16px" }}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {VIEW_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
