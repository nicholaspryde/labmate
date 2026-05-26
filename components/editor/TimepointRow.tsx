import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { addMinutes, format } from "date-fns";
import { Calendar as CalendarIcon, ChevronRight, Plus, TextAlignStart } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { fromTotalMinutes } from "@/lib/timepointMath";
import { RELATIVE_TO_PREVIOUS, type OffsetMode } from "@/lib/types";
import { AnchoredList } from "@/components/ui/anchored-list";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRETEXT_ICON_COLOR = "text-[#a8adb5]";

function PretextIconContainer({ children }: { children?: ReactNode }) {
  return (
    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center", PRETEXT_ICON_COLOR)}>
      {children}
    </span>
  );
}

function formatRelativeReferenceReadout(
  relativeToMode: "default" | "previous" | "specific",
  referenceLabel: string,
): string {
  if (relativeToMode === "default") {
    return "from +0";
  }
  if (relativeToMode === "previous") {
    return "from previous event";
  }
  return `from ${referenceLabel}`;
}

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

function timeOptionButtonClassName(isSelected: boolean) {
  return cn(
    "flex w-full cursor-default items-center rounded-sm px-2.5 py-2 text-left text-sm outline-none hover:bg-accent",
    isSelected && "bg-[#f5f6f8] font-medium text-[#161616] hover:bg-[#eceef1]",
  );
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

type RelativeReferenceOption = {
  id: string;
  label: string;
};

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
  mode: OffsetMode;
  displayOffsetMinutes: number;
  authorOffsetMinutes: number;
  relativeReferenceLabel: string;
  relativeReferenceOptions: RelativeReferenceOption[];
  selectedRelativeReferenceId: string;
  relativeToMode: "default" | "previous" | "specific";
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onScheduledTimeChange: (hasScheduledTime: boolean) => void;
  onDurationChange: (durationMinutes: number) => void;
  onDisplayOffsetChange: (minutes: number) => void;
  onAuthorOffsetChange: (minutes: number) => void;
  onRelativeReferenceChange: (relativeToTimepointId: string | null) => void;
  onDateTimeChange: (date: Date) => void;
  onFocus: () => void;
  onDelete?: () => void;
  autoFocusName?: boolean;
  onNameFocusComplete?: () => void;
  animateEnter?: boolean;
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
  mode,
  displayOffsetMinutes,
  authorOffsetMinutes,
  relativeReferenceLabel,
  relativeReferenceOptions,
  selectedRelativeReferenceId,
  relativeToMode,
  onNameChange,
  onDescriptionChange,
  onScheduledTimeChange,
  onDurationChange,
  onDisplayOffsetChange,
  onAuthorOffsetChange,
  onRelativeReferenceChange,
  onDateTimeChange,
  onFocus,
  onDelete,
  autoFocusName = false,
  onNameFocusComplete,
  animateEnter = false,
}: TimepointRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const enterControls = useAnimation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isAnchor,
  });
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const cardShadow =
    "0px 3px 6px -2px lch(0% 0 0 / 0.02), 0px 1px 1px lch(0% 0 0 / 0.04)";

  useLayoutEffect(() => {
    if (!animateEnter || shouldReduceMotion) return;

    void enterControls.set({ opacity: 0, y: 6, filter: "blur(3px)" });
    void enterControls.start(
      { opacity: 1, y: 0, filter: "blur(0px)" },
      shouldReduceMotion
        ? { duration: 0 }
        : {
            y: { type: "spring", visualDuration: 0.42, bounce: 0 },
            opacity: { type: "spring", visualDuration: 0.38, bounce: 0 },
            filter: { duration: 0.24, ease: [0.33, 1, 0.68, 1] },
          },
    );
  }, [animateEnter, enterControls, shouldReduceMotion]);
  const [showDescriptionInput, setShowDescriptionInput] = useState(Boolean(description.trim()));
  const [timeEntryActive, setTimeEntryActive] = useState(hasScheduledTime);
  const [startTimeInput, setStartTimeInput] = useState("");
  const [endTimeInput, setEndTimeInput] = useState("");
  const [startSuggestionsOpen, setStartSuggestionsOpen] = useState(false);
  const [endSuggestionsOpen, setEndSuggestionsOpen] = useState(false);
  const [timeInputError, setTimeInputError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const startTimeInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const [relativeOffsetAnchorEl, setRelativeOffsetAnchorEl] = useState<HTMLDivElement | null>(null);
  const [startTimeAnchorEl, setStartTimeAnchorEl] = useState<HTMLDivElement | null>(null);
  const [endTimeAnchorEl, setEndTimeAnchorEl] = useState<HTMLDivElement | null>(null);
  const [relativeOffsetInput, setRelativeOffsetInput] = useState(formatRelativeOffsetInput(displayOffsetMinutes));
  const [relativeOffsetError, setRelativeOffsetError] = useState<string | null>(null);
  const [relativeSuggestionsOpen, setRelativeSuggestionsOpen] = useState(false);
  const [relativeToPickerOpen, setRelativeToPickerOpen] = useState(false);
  const [relativeToMenuLevel, setRelativeToMenuLevel] = useState<"first" | "specific">("first");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [relativeToPickerAnchorEl, setRelativeToPickerAnchorEl] = useState<HTMLButtonElement | null>(null);
  const relativeToPickerPanelRef = useRef<HTMLDivElement>(null);
  const relativeToSpecificPanelRef = useRef<HTMLDivElement>(null);
  const isCustomMode = mode === "custom";
  const inlineReferenceLabel = formatRelativeReferenceReadout(relativeToMode, relativeReferenceLabel);
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

  const closeRelativeToPicker = () => {
    setRelativeToPickerOpen(false);
    setRelativeToMenuLevel("first");
  };

  useEffect(() => {
    if (!relativeToPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (relativeToPickerAnchorEl?.contains(target)) {
        return;
      }
      if (relativeToPickerPanelRef.current?.contains(target)) {
        return;
      }
      if (relativeToSpecificPanelRef.current?.contains(target)) {
        return;
      }
      closeRelativeToPicker();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRelativeToPicker();
      }
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [relativeToPickerOpen, relativeToPickerAnchorEl]);

  useEffect(() => {
    if (!isCustomMode && relativeToPickerOpen) {
      closeRelativeToPicker();
    }
  }, [isCustomMode, relativeToPickerOpen]);

  useLayoutEffect(() => {
    if (!autoFocusName) {
      return;
    }

    const input = nameInputRef.current;
    if (!input) {
      return;
    }

    input.focus();
    input.select();
    onNameFocusComplete?.();
  }, [autoFocusName, onNameFocusComplete]);

  useEffect(() => {
    setRelativeOffsetInput(formatRelativeOffsetInput(displayOffsetMinutes));
    setRelativeOffsetError(null);
  }, [displayOffsetMinutes]);

  useEffect(() => {
    if (hasScheduledTime) {
      setTimeEntryActive(true);
    }
  }, [hasScheduledTime]);

  const selectedStartTimeValue = format(resolvedAt, "HH:mm");
  const resolvedEndAt = addMinutes(resolvedAt, durationMinutes);
  const selectedEndTimeValue = format(resolvedEndAt, "HH:mm");
  const formattedDateLabel = format(resolvedAt, "EEE, MMMM d");
  const startTimeOptions = buildSingleTimeOptions(
    resolvedAt,
    hasScheduledTime ? selectedStartTimeValue : undefined,
  );
  const endTimeOptions = buildSingleTimeOptions(resolvedAt, hasScheduledTime ? selectedEndTimeValue : undefined);
  const startTimeInputWidthCh = Math.max(startTimeInput.length + 2, 7);
  const endTimeInputWidthCh = Math.max(endTimeInput.length + 2, 7);
  const timeFieldClassName = cn(
    "h-8 w-auto min-w-[4.5rem] rounded-[4px] border-0 bg-white px-2 py-0 text-left text-[14px] font-normal shadow-none hover:bg-[#f5f6f8] focus:bg-[#f5f6f8] focus-visible:ring-0",
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

  const handleCalendarDateSelect = (nextDate: Date | undefined) => {
    if (!nextDate) {
      return;
    }
    const next = new Date(resolvedAt);
    next.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
    onDateTimeChange(next);
    setDatePickerOpen(false);
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

  const applyDisplayOffsetInput = (): boolean => {
    const parsed = parseRelativeOffsetInput(relativeOffsetInput);
    if (parsed === null) {
      setRelativeOffsetError("Use format like +1d, +3h, +30m");
      return false;
    }
    onDisplayOffsetChange(parsed);
    setRelativeOffsetInput(formatRelativeOffsetInput(parsed));
    setRelativeOffsetError(null);
    return true;
  };

  const applyDisplaySuggestion = (suggestion: string) => {
    const parsed = parseRelativeOffsetInput(suggestion);
    if (parsed === null) {
      return;
    }
    onDisplayOffsetChange(parsed);
    setRelativeOffsetInput(formatRelativeOffsetInput(parsed));
    setRelativeOffsetError(null);
    setRelativeSuggestionsOpen(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={cn(isDragging && "opacity-50")}
      onClick={onFocus}
    >
      <motion.div
        className="group relative rounded-[12px] border border-[#e3e3e3] bg-white p-3"
        style={{ boxShadow: cardShadow }}
        animate={enterControls}
        initial={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      >
        {onDelete && (
          <button
            type="button"
            aria-label="Delete timepoint"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute right-4 top-5 flex h-6 w-6 items-center justify-center rounded-md text-[#a8adb5] opacity-0 transition-opacity duration-150 hover:bg-[#f5f6f8] hover:text-[#6b6b74] group-hover:opacity-100"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#f5f6f8] text-[12px] font-medium tabular-nums text-[#6b6b74]",
            !isAnchor && "cursor-grab"
          )}
          {...(!isAnchor ? attributes : {})}
          {...(!isAnchor ? listeners : {})}
        >
          {index}
        </div>

        <div className="min-w-0 flex-1 space-y-0">
          <Input
            ref={nameInputRef}
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Add event name"
            className="h-8 min-w-0 w-full border-0 bg-transparent px-0 py-0 text-base text-[#161616] shadow-none focus-visible:ring-0 placeholder:text-[#a8adb5]"
            onFocus={onFocus}
            aria-label="Add event name"
          />

          <div className="flex flex-col gap-0 pr-3 pb-2 pt-0">
            <div className="flex items-start">
              <PretextIconContainer>
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </PretextIconContainer>
              <div className="min-w-0 flex-1">
                <div className="flex items-center text-[14px] font-normal text-[#161616]">
              {isAnchor ? (
                <span className="inline-flex h-8 items-center">0</span>
              ) : isCustomMode ? (
                <div className="relative inline-flex h-8 shrink-0 items-center">
                  <div ref={setRelativeOffsetAnchorEl} className="relative shrink-0">
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
                        applyDisplayOffsetInput();
                        setTimeout(() => setRelativeSuggestionsOpen(false), 120);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          applyDisplayOffsetInput();
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
                        if (relativeToPickerOpen) {
                          closeRelativeToPicker();
                        }
                      }}
                      className={cn(
                        "block h-8 !w-auto min-w-0 max-w-full border-0 bg-transparent px-1 py-0 text-left text-[14px] font-normal shadow-none [field-sizing:content] hover:bg-[#f5f6f8] focus:bg-[#f5f6f8] focus-visible:ring-0 rounded-[4px]",
                        relativeSuggestionsOpen && "bg-[#f5f6f8]",
                      )}
                      aria-label="Relative offset"
                    />
                    <AnchoredList
                      open={relativeSuggestionsOpen && !relativeToPickerOpen}
                      anchorEl={relativeOffsetAnchorEl}
                      width={176}
                    >
                      {relativeSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="flex w-full cursor-default items-center rounded-sm px-2.5 py-2 text-left text-sm outline-none hover:bg-accent"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            applyDisplaySuggestion(suggestion);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </AnchoredList>
                  </div>

                  <button
                    ref={setRelativeToPickerAnchorEl}
                    type="button"
                    className={cn(
                      "inline-flex h-8 min-w-0 max-w-[16rem] items-center rounded-[4px] px-1 text-[14px] font-normal whitespace-nowrap text-[#161616] hover:bg-[#f5f6f8]",
                      relativeToPickerOpen && "bg-[#f5f6f8]",
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (relativeToPickerOpen) {
                        closeRelativeToPicker();
                      } else {
                        setRelativeSuggestionsOpen(false);
                        setRelativeToPickerOpen(true);
                      }
                    }}
                    aria-expanded={relativeToPickerOpen}
                    aria-haspopup="listbox"
                    aria-label={inlineReferenceLabel}
                  >
                    <span className="truncate">{inlineReferenceLabel}</span>
                  </button>

                  <AnchoredList
                    open={relativeToPickerOpen}
                    anchorEl={relativeToPickerAnchorEl}
                    panelRef={relativeToPickerPanelRef}
                    width={200}
                  >
                    <button
                      type="button"
                      className={timeOptionButtonClassName(relativeToMode === "default")}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onRelativeReferenceChange(null);
                        closeRelativeToPicker();
                      }}
                    >
                      +0
                    </button>
                    <button
                      type="button"
                      className={timeOptionButtonClassName(relativeToMode === "previous")}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onRelativeReferenceChange(RELATIVE_TO_PREVIOUS);
                        closeRelativeToPicker();
                      }}
                    >
                      previous event
                    </button>
                    {relativeReferenceOptions.length > 0 && (
                      <button
                        type="button"
                        className={cn(
                          timeOptionButtonClassName(relativeToMode === "specific"),
                          "flex items-center justify-between",
                          relativeToMenuLevel === "specific" && "bg-[#f5f6f8]",
                        )}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setRelativeToMenuLevel((level) =>
                            level === "specific" ? "first" : "specific",
                          );
                        }}
                      >
                        <span>specific event</span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#6b6b74]" />
                      </button>
                    )}
                  </AnchoredList>

                  <AnchoredList
                    open={relativeToPickerOpen && relativeToMenuLevel === "specific"}
                    anchorEl={relativeToPickerAnchorEl}
                    panelRef={relativeToSpecificPanelRef}
                    xOffset={204}
                    width={192}
                  >
                    {relativeReferenceOptions.map((option) => {
                      const isSelected =
                        relativeToMode === "specific" && option.id === selectedRelativeReferenceId;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={timeOptionButtonClassName(isSelected)}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onRelativeReferenceChange(option.id);
                            closeRelativeToPicker();
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </AnchoredList>
                </div>
              ) : (
                <div className="relative inline-flex h-8 shrink-0 items-center">
                  <div ref={setRelativeOffsetAnchorEl} className="relative shrink-0">
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
                        applyDisplayOffsetInput();
                        setTimeout(() => setRelativeSuggestionsOpen(false), 120);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          applyDisplayOffsetInput();
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
                        "block h-8 !w-auto min-w-0 max-w-full border-0 bg-transparent px-0 py-0 text-left text-[14px] font-normal shadow-none [field-sizing:content] hover:bg-[#f5f6f8] focus:bg-[#f5f6f8] focus-visible:ring-0 rounded-[4px]",
                        relativeSuggestionsOpen && "bg-[#f5f6f8]",
                      )}
                      aria-label="Relative offset"
                    />
                    <AnchoredList
                      open={relativeSuggestionsOpen}
                      anchorEl={relativeOffsetAnchorEl}
                      width={176}
                    >
                      {relativeSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="flex w-full cursor-default items-center rounded-sm px-2.5 py-2 text-left text-sm outline-none hover:bg-accent"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            applyDisplaySuggestion(suggestion);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </AnchoredList>
                  </div>
                </div>
              )}
                </div>
                {isActive && !isAnchor && relativeOffsetError && (
                  <p className="text-xs text-red-600">{relativeOffsetError}</p>
                )}
              </div>
            </div>
            <div className="flex items-start">
              <PretextIconContainer>
                <CalendarIcon className="h-3.5 w-3.5" aria-hidden />
              </PretextIconContainer>
              <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1 text-sm font-normal" onClick={(event) => event.stopPropagation()}>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-8 w-fit justify-start border-0 bg-transparent px-0 py-0 pr-2 text-[14px] font-normal shadow-none hover:bg-[#f5f6f8]",
                      isActive ? "text-[#161616]" : "text-[#6b6b74]",
                    )}
                    aria-label="Choose event day"
                  >
                    {formattedDateLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={resolvedAt}
                    defaultMonth={resolvedAt}
                    onSelect={handleCalendarDateSelect}
                  />
                </PopoverContent>
              </Popover>
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
                        hasScheduledTime
                          ? selectedStartTimeValue
                          : !startTimeInput.trim()
                            ? defaultStartScrollValue
                            : undefined
                      }
                    >
                      {startTimeOptions.map((option) => {
                        const isSelected =
                          hasScheduledTime && option.value === selectedStartTimeValue;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            data-time-value={option.value}
                            aria-selected={isSelected}
                            className={timeOptionButtonClassName(isSelected)}
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
                        );
                      })}
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
                        hasScheduledTime
                          ? selectedEndTimeValue
                          : !endTimeInput.trim()
                            ? defaultEndScrollValue
                            : undefined
                      }
                    >
                      {endTimeOptions.map((option) => {
                        const isSelected = hasScheduledTime && option.value === selectedEndTimeValue;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            data-time-value={option.value}
                            aria-selected={isSelected}
                            className={timeOptionButtonClassName(isSelected)}
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
                        );
                      })}
                    </AnchoredList>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-8 items-center bg-transparent px-2 text-[14px] font-normal text-[#a8adb5] hover:text-[#8f959e]"
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
                {isActive && timeInputError && (
                  <p className="text-xs text-red-600">{timeInputError}</p>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <PretextIconContainer>
                <TextAlignStart className="h-3.5 w-3.5" aria-hidden />
              </PretextIconContainer>
              <div className="min-w-0 flex-1 flex items-center">
              {!showDescriptionInput ? (
                <button
                  type="button"
                  className="inline-flex h-8 min-w-0 flex-1 items-center bg-transparent pr-2 text-left text-[14px] font-normal text-[#a8adb5] hover:text-[#8f959e]"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowDescriptionInput(true);
                    requestAnimationFrame(() => {
                      descriptionInputRef.current?.focus();
                    });
                  }}
                >
                  Description
                </button>
              ) : (
                <Input
                  ref={descriptionInputRef}
                  value={description}
                  placeholder="Description"
                  className="h-8 min-w-0 flex-1 border-0 px-0 pr-2 text-sm font-normal text-[#161616] shadow-none placeholder:text-[#a8adb5] hover:bg-[#f5f6f8] focus-visible:ring-0"
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
      </div>
      </motion.div>
    </div>
  );
}
