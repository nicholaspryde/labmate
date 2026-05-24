import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { addDays, addMinutes, format } from "date-fns";
import { Clock3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fromTotalMinutes } from "@/lib/timepointMath";
import { AnchoredList } from "@/components/ui/anchored-list";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function formatRelativeOffsetInput(totalMinutes: number): string {
  const { days, hours, minutes } = fromTotalMinutes(totalMinutes);
  const parts: string[] = [];

  if (days > 0 && hours === 0 && minutes === 0 && days % 7 === 0) {
    const weeks = days / 7;
    parts.push(`${weeks} week${weeks === 1 ? "" : "s"}`);
  } else {
    if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
    if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  }

  if (parts.length === 0) {
    parts.push("0 minutes");
  }

  return parts.join(" ");
}

function parseRelativeOffsetInput(value: string): number | null {
  const compact = value
    .trim()
    .toLowerCase()
    .replace(/\+/g, "")
    .replace(/weeks?/g, "w")
    .replace(/days?/g, "d")
    .replace(/hours?/g, "h")
    .replace(/hrs?/g, "h")
    .replace(/minutes?/g, "m")
    .replace(/mins?/g, "m")
    .replace(/\s+/g, "");
  if (!compact) return null;

  const matcher = /([+-]?\d+)([wdhm])/g;
  let total = 0;
  let consumed = 0;
  let found = false;
  let match = matcher.exec(compact);
  while (match) {
    if (match.index !== consumed) {
      return null;
    }
    const numeric = Number.parseInt(match[1], 10);
    const unit = match[2];
    if (Number.isNaN(numeric)) {
      return null;
    }
    if (unit === "w") total += numeric * 7 * 24 * 60;
    if (unit === "d") total += numeric * 24 * 60;
    if (unit === "h") total += numeric * 60;
    if (unit === "m") total += numeric;
    consumed += match[0].length;
    found = true;
    match = matcher.exec(compact);
  }

  if (!found || consumed !== compact.length || total < 0) {
    return null;
  }
  return total;
}

function buildSingleTimeOptions(resolvedAt: Date, selectedTimeValue?: string) {
  const options = Array.from({ length: 48 }, (_, index) => {
    const hours = Math.floor(index / 2);
    const minutes = index % 2 === 0 ? 0 : 30;
    const time = new Date(resolvedAt);
    time.setHours(hours, minutes, 0, 0);
    return {
      value: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
      label: format(time, "h:mmaaa").toLowerCase(),
    };
  });

  if (selectedTimeValue && !options.some((option) => option.value === selectedTimeValue)) {
    const [hour, minute] = selectedTimeValue.split(":").map((part) => Number.parseInt(part, 10));
    if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
      const time = new Date(resolvedAt);
      time.setHours(hour, minute, 0, 0);
      options.push({
        value: selectedTimeValue,
        label: format(time, "h:mmaaa").toLowerCase(),
      });
      options.sort((left, right) => left.value.localeCompare(right.value));
    }
  }

  return options;
}

function formatTimeLabel(resolvedAt: Date, hour: number, minute: number): string {
  const time = new Date(resolvedAt);
  time.setHours(hour, minute, 0, 0);
  return format(time, "h:mmaaa").toLowerCase();
}

function closestTimeSlotValue(reference = new Date()): string {
  const totalMinutes = reference.getHours() * 60 + reference.getMinutes();
  const roundedMinutes = Math.min(23 * 60 + 30, Math.round(totalMinutes / 30) * 30);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function timeValueToLabel(resolvedAt: Date, value: string): string {
  const [hour, minute] = value.split(":").map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return "";
  }
  return formatTimeLabel(resolvedAt, hour, minute);
}

function durationFromEndTime(resolvedAt: Date, endHour: number, endMinute: number): number {
  const startMinutes = resolvedAt.getHours() * 60 + resolvedAt.getMinutes();
  let endMinutes = endHour * 60 + endMinute;
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }
  return Math.max(1, endMinutes - startMinutes);
}

function parseTimeInput(value: string): { hour: number; minute: number } | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "+ Time") {
    return null;
  }

  const startPart = trimmed.split(/\s*[-–—]\s*/)[0]?.trim() ?? trimmed;

  const match24 = startPart.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hour = Number.parseInt(match24[1], 10);
    const minute = Number.parseInt(match24[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
    return null;
  }

  const match12 = startPart.match(/^(\d{1,2})(?::(\d{2}))?\s*(a|am|p|pm)\.?$/i);
  if (match12) {
    let hour = Number.parseInt(match12[1], 10);
    const minute = match12[2] ? Number.parseInt(match12[2], 10) : 0;
    const meridiem = match12[3].toLowerCase();
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      return null;
    }
    const isPm = meridiem.startsWith("p");
    if (hour === 12) {
      hour = isPm ? 12 : 0;
    } else if (isPm) {
      hour += 12;
    }
    return { hour, minute };
  }

  return null;
}

type TimepointRowProps = {
  id: string;
  index: number;
  name: string;
  description: string;
  hasScheduledTime: boolean;
  durationMinutes: number;
  isAnchor: boolean;
  isActive: boolean;
  resolvedAt: Date;
  displayOffsetMinutes: number;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onScheduledTimeChange: (hasScheduledTime: boolean) => void;
  onDurationChange: (durationMinutes: number) => void;
  onOffsetChange: (minutes: number) => void;
  onDateTimeChange: (date: Date) => void;
  onFocus: () => void;
};

export function TimepointRow({
  id,
  index,
  name,
  description,
  hasScheduledTime,
  durationMinutes,
  isAnchor,
  isActive,
  resolvedAt,
  displayOffsetMinutes,
  onNameChange,
  onDescriptionChange,
  onScheduledTimeChange,
  onDurationChange,
  onOffsetChange,
  onDateTimeChange,
  onFocus,
}: TimepointRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isAnchor,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const [showDescriptionInput, setShowDescriptionInput] = useState(Boolean(description.trim()));
  const [timeEntryActive, setTimeEntryActive] = useState(hasScheduledTime);
  const [startTimeInput, setStartTimeInput] = useState("");
  const [endTimeInput, setEndTimeInput] = useState("");
  const [startSuggestionsOpen, setStartSuggestionsOpen] = useState(false);
  const [endSuggestionsOpen, setEndSuggestionsOpen] = useState(false);
  const [timeInputError, setTimeInputError] = useState<string | null>(null);
  const startTimeInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const [relativeOffsetAnchorEl, setRelativeOffsetAnchorEl] = useState<HTMLDivElement | null>(null);
  const [startTimeAnchorEl, setStartTimeAnchorEl] = useState<HTMLDivElement | null>(null);
  const [endTimeAnchorEl, setEndTimeAnchorEl] = useState<HTMLDivElement | null>(null);
  const [relativeOffsetInput, setRelativeOffsetInput] = useState(formatRelativeOffsetInput(displayOffsetMinutes));
  const [relativeOffsetError, setRelativeOffsetError] = useState<string | null>(null);
  const [relativeSuggestionsOpen, setRelativeSuggestionsOpen] = useState(false);
  const relativeOffsetWidthCh = Math.max(relativeOffsetInput.length + 2, 10);
  const relativeSuggestions = [
    "+4 hours",
    "+8 hours",
    "+12 hours",
    "+1 day",
    "+2 days",
    "+3 days",
    "+2 weeks",
    "+3 weeks",
    "+1 day 12 hours",
    "+7 days",
  ];

  useEffect(() => {
    if (description.trim()) {
      setShowDescriptionInput(true);
    }
  }, [description]);

  useEffect(() => {
    setRelativeOffsetInput(formatRelativeOffsetInput(displayOffsetMinutes));
    setRelativeOffsetError(null);
  }, [displayOffsetMinutes]);

  useEffect(() => {
    if (hasScheduledTime) {
      setTimeEntryActive(true);
    }
  }, [hasScheduledTime]);

  const selectedDateValue = format(resolvedAt, "yyyy-MM-dd");
  const selectedStartTimeValue = format(resolvedAt, "HH:mm");
  const resolvedEndAt = addMinutes(resolvedAt, durationMinutes);
  const selectedEndTimeValue = format(resolvedEndAt, "HH:mm");
  const dayOptions = Array.from({ length: 15 }, (_, offset) => {
    const date = addDays(resolvedAt, offset - 7);
    return {
      value: format(date, "yyyy-MM-dd"),
      label: format(date, "EEEE, MMMM d"),
    };
  });
  const startTimeOptions = buildSingleTimeOptions(
    resolvedAt,
    hasScheduledTime ? selectedStartTimeValue : undefined,
  );
  const endTimeOptions = buildSingleTimeOptions(resolvedAt, hasScheduledTime ? selectedEndTimeValue : undefined);
  const filteredStartTimeOptions =
    startTimeInput.trim().length === 0
      ? startTimeOptions
      : startTimeOptions.filter((option) => {
          const query = startTimeInput.trim().toLowerCase();
          return option.label.toLowerCase().includes(query) || option.value.includes(query);
        });
  const filteredEndTimeOptions =
    endTimeInput.trim().length === 0
      ? endTimeOptions
      : endTimeOptions.filter((option) => {
          const query = endTimeInput.trim().toLowerCase();
          return option.label.toLowerCase().includes(query) || option.value.includes(query);
        });
  const startTimeInputWidthCh = Math.max(startTimeInput.length + 2, 7);
  const endTimeInputWidthCh = Math.max(endTimeInput.length + 2, 7);
  const timeFieldClassName = cn(
    "h-8 w-auto min-w-[4.5rem] rounded-[4px] border-0 bg-[#f5f6f8] px-2 py-0 text-left text-[14px] shadow-none hover:bg-[#eceef1] focus:bg-[#eceef1] focus-visible:ring-0",
    isActive ? "text-[#161616]" : "text-[#6b6b74]",
  );
  const defaultStartScrollValue = closestTimeSlotValue();
  const defaultEndScrollValue = closestTimeSlotValue(addMinutes(new Date(), 60));
  const defaultStartTimeLabel = timeValueToLabel(resolvedAt, defaultStartScrollValue);
  const defaultEndTimeLabel = timeValueToLabel(resolvedAt, defaultEndScrollValue);

  useEffect(() => {
    if (hasScheduledTime && !startSuggestionsOpen && !endSuggestionsOpen) {
      setStartTimeInput(
        formatTimeLabel(resolvedAt, resolvedAt.getHours(), resolvedAt.getMinutes()),
      );
      setEndTimeInput(
        formatTimeLabel(resolvedEndAt, resolvedEndAt.getHours(), resolvedEndAt.getMinutes()),
      );
      setTimeInputError(null);
    }
  }, [
    hasScheduledTime,
    selectedStartTimeValue,
    selectedEndTimeValue,
    durationMinutes,
    resolvedAt,
    startSuggestionsOpen,
    endSuggestionsOpen,
  ]);

  const handleDateSelect = (nextDateValue: string) => {
    const [year, month, day] = nextDateValue.split("-").map((part) => Number.parseInt(part, 10));
    if (!year || !month || !day) return;
    const next = new Date(resolvedAt);
    next.setFullYear(year, month - 1, day);
    onDateTimeChange(next);
  };

  const commitStartTime = (hour: number, minute: number) => {
    const next = new Date(resolvedAt);
    next.setHours(hour, minute, 0, 0);
    onDateTimeChange(next);
    onScheduledTimeChange(true);
    setStartTimeInput(formatTimeLabel(resolvedAt, hour, minute));
    setTimeInputError(null);
    setStartSuggestionsOpen(false);
  };

  const commitEndTime = (hour: number, minute: number) => {
    onDurationChange(durationFromEndTime(resolvedAt, hour, minute));
    onScheduledTimeChange(true);
    setEndTimeInput(formatTimeLabel(resolvedAt, hour, minute));
    setTimeInputError(null);
    setEndSuggestionsOpen(false);
  };

  const applyStartTimeInput = () => {
    const parsed = parseTimeInput(startTimeInput);
    if (parsed) {
      commitStartTime(parsed.hour, parsed.minute);
      return;
    }

    if (!startTimeInput.trim()) {
      setTimeInputError(null);
      return;
    }

    setTimeInputError("Use format like 1:00pm or 13:30");
  };

  const applyEndTimeInput = () => {
    const parsed = parseTimeInput(endTimeInput);
    if (parsed) {
      commitEndTime(parsed.hour, parsed.minute);
      return;
    }

    if (!endTimeInput.trim()) {
      setTimeInputError(null);
      return;
    }

    setTimeInputError("Use format like 2:00pm or 14:30");
  };

  const applyRelativeOffsetInput = () => {
    const parsed = parseRelativeOffsetInput(relativeOffsetInput);
    if (parsed === null) {
      setRelativeOffsetError("Use format like +1d, +3h, +30m");
      return;
    }
    onOffsetChange(parsed);
    setRelativeOffsetInput(formatRelativeOffsetInput(parsed));
    setRelativeOffsetError(null);
  };

  const applySuggestion = (suggestion: string) => {
    const parsed = parseRelativeOffsetInput(suggestion);
    if (parsed === null) {
      return;
    }
    onOffsetChange(parsed);
    setRelativeOffsetInput(formatRelativeOffsetInput(parsed));
    setRelativeOffsetError(null);
    setRelativeSuggestionsOpen(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b border-[#e3e3e3] px-0 py-5 last:border-b-0",
        isDragging && "opacity-50"
      )}
      onClick={onFocus}
    >
      <div className="flex items-start gap-8">
        <div
          className={cn(
            "flex min-w-8 items-center gap-1 text-base text-[#1d232f]",
            !isAnchor && "cursor-grab"
          )}
          {...(!isAnchor ? attributes : {})}
          {...(!isAnchor ? listeners : {})}
        >
          <span>{index}</span>
          <Clock3 className="h-4 w-4 text-[#5b6480]" />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <Input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className="h-8 border-0 px-1 py-0 text-base font-semibold text-[#161616] shadow-none hover:bg-[#f5f6f8] focus-visible:ring-0"
              onFocus={onFocus}
            />
          </div>

          <div className="flex flex-col gap-0 rounded-[4px] px-3 py-2 bg-transparent">
            <div className="flex items-center gap-2 text-[31 36 45] text-base text-[#161616]">
              {isAnchor ? (
                <div className="relative h-8 w-28">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#161616]">+</span>
                  <span className="inline-flex h-8 w-full items-center bg-transparent pl-6">0</span>
                </div>
              ) : (
                <div ref={setRelativeOffsetAnchorEl} className="relative h-8 w-fit min-w-28">
                  <span className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-[#161616]">+</span>
                  <Input
                    value={relativeOffsetInput}
                    onChange={(event) => {
                      setRelativeOffsetInput(event.target.value);
                      if (relativeOffsetError) {
                        setRelativeOffsetError(null);
                      }
                      if (!relativeSuggestionsOpen) {
                        setRelativeSuggestionsOpen(true);
                      }
                    }}
                    onBlur={() => {
                      applyRelativeOffsetInput();
                      setTimeout(() => setRelativeSuggestionsOpen(false), 120);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        applyRelativeOffsetInput();
                        setRelativeSuggestionsOpen(false);
                      }
                      if (event.key === "Escape") {
                        setRelativeSuggestionsOpen(false);
                      }
                    }}
                    onClick={(event) => event.stopPropagation()}
                    onFocus={(event) => {
                      onFocus();
                      event.target.select();
                      setRelativeSuggestionsOpen(true);
                    }}
                    className={cn(
                      "h-8 w-auto min-w-28 border-0 bg-transparent px-0 py-0 pl-6 text-left text-base shadow-none hover:bg-[#f5f6f8] focus:bg-[#f5f6f8] focus-visible:ring-0",
                      relativeSuggestionsOpen && "bg-[#f5f6f8]"
                    )}
                    style={{ width: `${relativeOffsetWidthCh}ch` }}
                    aria-label="Relative offset"
                  />
                  <AnchoredList
                    open={relativeSuggestionsOpen}
                    anchorEl={relativeOffsetAnchorEl}
                    width={176}
                    className="max-h-52 overflow-auto"
                  >
                    {relativeSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="flex w-full cursor-default items-center rounded-sm px-2.5 py-2 text-left text-sm outline-none hover:bg-accent"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          applySuggestion(suggestion);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </AnchoredList>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-sm" onClick={(event) => event.stopPropagation()}>
              <Select value={selectedDateValue} onValueChange={handleDateSelect}>
                <SelectTrigger
                  className={cn(
                    "h-8 w-fit border-0 bg-transparent px-2 py-0 pr-2 text-[14px] shadow-none hover:bg-[#f5f6f8] focus:ring-0 [&>svg]:hidden",
                    isActive ? "text-[#161616]" : "text-[#6b6b74]"
                  )}
                  aria-label="Choose event day"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {timeEntryActive ? (
                <>
                  <span className={cn("text-[14px]", isActive ? "text-[#161616]" : "text-[#6b6b74]")}>at</span>
                  <div ref={setStartTimeAnchorEl} className="relative h-8 w-fit">
                    <Input
                      ref={startTimeInputRef}
                      value={startTimeInput}
                      placeholder={defaultStartTimeLabel}
                      onChange={(event) => {
                        setStartTimeInput(event.target.value);
                        if (timeInputError) {
                          setTimeInputError(null);
                        }
                        setStartSuggestionsOpen(true);
                        setEndSuggestionsOpen(false);
                      }}
                      onBlur={() => {
                        applyStartTimeInput();
                        setTimeout(() => setStartSuggestionsOpen(false), 120);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          applyStartTimeInput();
                          setStartSuggestionsOpen(false);
                        }
                        if (event.key === "Escape") {
                          setStartSuggestionsOpen(false);
                          setStartTimeInput(
                            formatTimeLabel(resolvedAt, resolvedAt.getHours(), resolvedAt.getMinutes()),
                          );
                          setTimeInputError(null);
                        }
                      }}
                      onClick={(event) => event.stopPropagation()}
                      onFocus={(event) => {
                        onFocus();
                        event.target.select();
                        setStartSuggestionsOpen(true);
                        setEndSuggestionsOpen(false);
                      }}
                      className={timeFieldClassName}
                      style={{ width: `${startTimeInputWidthCh}ch` }}
                      aria-label="Start time"
                    />
                    <AnchoredList
                      open={startSuggestionsOpen}
                      anchorEl={startTimeAnchorEl}
                      width={120}
                      initialScrollToValue={
                        !hasScheduledTime && !startTimeInput.trim() ? defaultStartScrollValue : undefined
                      }
                    >
                      {filteredStartTimeOptions.length > 0 ? (
                        filteredStartTimeOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            data-time-value={option.value}
                            className="flex w-full cursor-default items-center rounded-sm px-2.5 py-2 text-left text-sm outline-none hover:bg-accent"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const [hour, minute] = option.value
                                .split(":")
                                .map((part) => Number.parseInt(part, 10));
                              if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
                                commitStartTime(hour, minute);
                              }
                            }}
                          >
                            {option.label}
                          </button>
                        ))
                      ) : (
                        <p className="px-2.5 py-2 text-sm text-muted-foreground">No matching times</p>
                      )}
                    </AnchoredList>
                  </div>
                  <span className={cn("text-[14px]", isActive ? "text-[#161616]" : "text-[#6b6b74]")}>-</span>
                  <div ref={setEndTimeAnchorEl} className="relative h-8 w-fit">
                    <Input
                      value={endTimeInput}
                      placeholder={defaultEndTimeLabel}
                      onChange={(event) => {
                        setEndTimeInput(event.target.value);
                        if (timeInputError) {
                          setTimeInputError(null);
                        }
                        setEndSuggestionsOpen(true);
                        setStartSuggestionsOpen(false);
                      }}
                      onBlur={() => {
                        applyEndTimeInput();
                        setTimeout(() => setEndSuggestionsOpen(false), 120);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          applyEndTimeInput();
                          setEndSuggestionsOpen(false);
                        }
                        if (event.key === "Escape") {
                          setEndSuggestionsOpen(false);
                          setEndTimeInput(
                            formatTimeLabel(
                              resolvedEndAt,
                              resolvedEndAt.getHours(),
                              resolvedEndAt.getMinutes(),
                            ),
                          );
                          setTimeInputError(null);
                        }
                      }}
                      onClick={(event) => event.stopPropagation()}
                      onFocus={(event) => {
                        onFocus();
                        event.target.select();
                        setEndSuggestionsOpen(true);
                        setStartSuggestionsOpen(false);
                      }}
                      className={timeFieldClassName}
                      style={{ width: `${endTimeInputWidthCh}ch` }}
                      aria-label="End time"
                    />
                    <AnchoredList
                      open={endSuggestionsOpen}
                      anchorEl={endTimeAnchorEl}
                      width={120}
                      initialScrollToValue={
                        !hasScheduledTime && !endTimeInput.trim() ? defaultEndScrollValue : undefined
                      }
                    >
                      {filteredEndTimeOptions.length > 0 ? (
                        filteredEndTimeOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            data-time-value={option.value}
                            className="flex w-full cursor-default items-center rounded-sm px-2.5 py-2 text-left text-sm outline-none hover:bg-accent"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const [hour, minute] = option.value
                                .split(":")
                                .map((part) => Number.parseInt(part, 10));
                              if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
                                commitEndTime(hour, minute);
                              }
                            }}
                          >
                            {option.label}
                          </button>
                        ))
                      ) : (
                        <p className="px-2.5 py-2 text-sm text-muted-foreground">No matching times</p>
                      )}
                    </AnchoredList>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-8 items-center bg-transparent px-2 text-[14px] text-[#a8adb5] hover:text-[#8f959e]"
                  onClick={(event) => {
                    event.stopPropagation();
                    setTimeEntryActive(true);
                    setStartTimeInput("");
                    setEndTimeInput("");
                    setStartSuggestionsOpen(true);
                    requestAnimationFrame(() => startTimeInputRef.current?.focus());
                  }}
                >
                  + Time
                </button>
              )}
            </div>
            {isActive && !isAnchor && relativeOffsetError && (
              <p className="text-xs text-red-600">{relativeOffsetError}</p>
            )}
            {isActive && timeInputError && (
              <p className="text-xs text-red-600">{timeInputError}</p>
            )}
            {!showDescriptionInput ? (
              <button
                type="button"
                className="inline-flex h-7 w-fit items-center bg-transparent px-2 text-[14px] text-[#a8adb5] hover:text-[#8f959e]"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowDescriptionInput(true);
                  requestAnimationFrame(() => {
                    descriptionInputRef.current?.focus();
                    descriptionInputRef.current?.select();
                  });
                }}
              >
                + Description
              </button>
            ) : (
              <Input
                ref={descriptionInputRef}
                value={description}
                placeholder="Description"
                className="h-8 w-full border-0 px-2 text-sm text-[#161616] shadow-none hover:bg-[#f5f6f8] focus-visible:ring-0"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onDescriptionChange(event.target.value)}
                onBlur={() => {
                  if (!description.trim()) {
                    if (description) {
                      onDescriptionChange("");
                    }
                    setShowDescriptionInput(false);
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
