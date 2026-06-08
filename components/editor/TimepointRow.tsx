import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { addMinutes, format } from "date-fns";
import { ChevronRight, Check, Plus, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { fromTotalMinutes } from "@/lib/timepointMath";
import { RELATIVE_TO_PREVIOUS, type OffsetMode } from "@/lib/types";
import { AnchoredList } from "@/components/ui/anchored-list";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, HIGHLIGHTED_SURFACE_SHADOW, SURFACE_SHADOW, SURFACE_SHADOW_HOVER } from "@/lib/utils";

function formatRelativeReferenceReadout(
  relativeToMode: "default" | "previous" | "specific",
  referenceLabel: string,
): string {
  if (relativeToMode === "default") {
    return "from first event";
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

type TimeOption = { value: string; label: string };

// Filters time options based on a partial user input like "8", "8a", "8:3", "8:30p", or "13".
// Returns all options if the input can't be parsed or no options match, so the user can
// still browse the list instead of seeing an empty dropdown.
function filterTimeOptions(options: TimeOption[], rawInput: string): TimeOption[] {
  const trimmed = rawInput.trim().toLowerCase().replace(/\.+$/, "");
  if (!trimmed) return options;

  const match = trimmed.match(/^(\d{1,2})(?::(\d{0,2}))?\s*(a|am|p|pm)?$/);
  if (!match) return options;

  const inputHourRaw = Number.parseInt(match[1], 10);
  const inputMinuteStr = match[2] ?? "";
  const inputMeridiem = match[3] ?? "";

  if (Number.isNaN(inputHourRaw) || inputHourRaw > 23) return options;

  let targetHour12 = inputHourRaw;
  let targetMeridiem = inputMeridiem;

  if (inputHourRaw === 0) {
    targetHour12 = 12;
    targetMeridiem = targetMeridiem || "am";
  } else if (inputHourRaw >= 13) {
    targetHour12 = inputHourRaw - 12;
    targetMeridiem = "pm";
  }

  const filtered = options.filter((option) => {
    const labelMatch = option.label.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
    if (!labelMatch) return false;
    const optHour = Number.parseInt(labelMatch[1], 10);
    const optMinute = labelMatch[2];
    const optMeridiem = labelMatch[3];

    if (optHour !== targetHour12) return false;
    if (inputMinuteStr && !optMinute.startsWith(inputMinuteStr)) return false;
    if (targetMeridiem && !optMeridiem.startsWith(targetMeridiem)) return false;
    return true;
  });

  return filtered.length > 0 ? filtered : options;
}

function formatTimeLabel(resolvedAt: Date, hour: number, minute: number): string {
  const time = new Date(resolvedAt);
  time.setHours(hour, minute, 0, 0);
  return format(time, "h:mmaaa").toLowerCase();
}

function timeOptionButtonClassName(isSelected: boolean) {
  return cn(
    "flex w-full cursor-pointer items-center rounded-sm px-2.5 py-2 text-left text-sm outline-none hover:bg-accent",
    isSelected && "bg-[#f0f0eb] font-medium text-[#161616] hover:bg-[#ebebe5]",
  );
}

function relativePickerOptionClassName(isSelected: boolean) {
  return cn(
    "flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-left text-sm outline-none hover:bg-accent",
    isSelected && "font-medium text-[#161616]",
  );
}

function RelativePickerCheck({ selected }: { selected: boolean }) {
  return (
    <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-hidden>
      {selected ? <Check className="h-3.5 w-3.5 text-[#161616]" strokeWidth={2.5} /> : null}
    </span>
  );
}

const fieldRevealOpacityTransition = {
  duration: 0.14,
  ease: [0.33, 1, 0.68, 1] as const,
};

const fieldRevealTransition = {
  height: { duration: 0.18, ease: [0.33, 1, 0.68, 1] as const },
  opacity: fieldRevealOpacityTransition,
};

const optimizeValueTransition = {
  duration: 0.32,
  ease: [0.33, 1, 0.68, 1] as const,
};

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

function getTimeInputWidthCh(value: string, placeholder: string): number {
  // +1 accounts for the caret; placeholder length ensures empty inputs fit their label.
  return Math.max((value || placeholder).length + 1, 7);
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
  name: string;
  description: string;
  hasScheduledTime: boolean;
  durationMinutes: number;
  isAnchor: boolean;
  isActive: boolean;
  isHighlighted?: boolean;
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
  skipDescriptionEnterAnimation?: boolean;
  optimizePulseKey?: number;
};

export function TimepointRow({
  id,
  name,
  description,
  hasScheduledTime,
  durationMinutes,
  isAnchor,
  isActive,
  isHighlighted = false,
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
  skipDescriptionEnterAnimation = false,
  optimizePulseKey = 0,
}: TimepointRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isAnchor,
  });
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const [showDescriptionInput, setShowDescriptionInput] = useState(Boolean(description.trim()));
  const [isSurfaceHovered, setIsSurfaceHovered] = useState(false);
  const [timeEntryActive, setTimeEntryActive] = useState(hasScheduledTime);
  const [startTimeInput, setStartTimeInput] = useState("");
  const [endTimeInput, setEndTimeInput] = useState("");
  const [startSuggestionsOpen, setStartSuggestionsOpen] = useState(false);
  const [endSuggestionsOpen, setEndSuggestionsOpen] = useState(false);
  const [timeInputError, setTimeInputError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const startTimeInputRef = useRef<HTMLInputElement>(null);
  const endTimeInputRef = useRef<HTMLInputElement>(null);
  const skipNextStartTimeBlurApplyRef = useRef(false);
  const skipNextEndTimeBlurApplyRef = useRef(false);
  const timeBlurCancelTimeoutRef = useRef<number | null>(null);
  const timeEntryCancelStateRef = useRef({
    hasScheduledTime,
    startTimeInput,
    endTimeInput,
  });
  timeEntryCancelStateRef.current = {
    hasScheduledTime,
    startTimeInput,
    endTimeInput,
  };
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
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
  const [relativeToSpecificItemEl, setRelativeToSpecificItemEl] = useState<HTMLButtonElement | null>(null);
  const relativeToPickerPanelRef = useRef<HTMLDivElement>(null);
  const relativeToSpecificPanelRef = useRef<HTMLDivElement>(null);
  const prevOptimizePulseKeyRef = useRef(optimizePulseKey);
  const [relativeDatesPulseActive, setRelativeDatesPulseActive] = useState(false);
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

  useEffect(() => {
    if (optimizePulseKey > prevOptimizePulseKeyRef.current) {
      prevOptimizePulseKeyRef.current = optimizePulseKey;
      if (!shouldReduceMotion) {
        setRelativeDatesPulseActive(true);
      }
    }
  }, [optimizePulseKey, shouldReduceMotion]);

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
  const formattedDateLabel = format(resolvedAt, "EEEE, MMMM d");
  const startTimeOptions = buildSingleTimeOptions(
    resolvedAt,
    hasScheduledTime ? selectedStartTimeValue : undefined,
  );
  const endTimeOptions = buildSingleTimeOptions(resolvedAt, hasScheduledTime ? selectedEndTimeValue : undefined);
  const currentStartLabel = hasScheduledTime
    ? formatTimeLabel(resolvedAt, resolvedAt.getHours(), resolvedAt.getMinutes())
    : "";
  const currentEndLabel = hasScheduledTime
    ? formatTimeLabel(resolvedEndAt, resolvedEndAt.getHours(), resolvedEndAt.getMinutes())
    : "";
  const filteredStartTimeOptions =
    startTimeInput.trim() !== "" && startTimeInput !== currentStartLabel
      ? filterTimeOptions(startTimeOptions, startTimeInput)
      : startTimeOptions;
  const filteredEndTimeOptions =
    endTimeInput.trim() !== "" && endTimeInput !== currentEndLabel
      ? filterTimeOptions(endTimeOptions, endTimeInput)
      : endTimeOptions;
  const timeFieldClassName = cn(
    "h-8 w-auto min-w-[3rem] rounded-[4px] border-0 bg-white px-1 py-0 text-left text-[14px] font-normal shadow-none transition-colors duration-150 hover:bg-[#f4f4f0] focus:bg-[#f4f4f0] focus-visible:ring-0",
    "text-[#161616]",
  );
  const defaultStartScrollValue = closestTimeSlotValue();
  const defaultEndScrollValue = closestTimeSlotValue(addMinutes(new Date(), 60));
  const defaultStartTimeLabel = timeValueToLabel(resolvedAt, defaultStartScrollValue);
  const defaultEndTimeLabel = timeValueToLabel(resolvedAt, defaultEndScrollValue);
  const startTimeInputWidthCh = getTimeInputWidthCh(startTimeInput, defaultStartTimeLabel);
  const endTimeInputWidthCh = getTimeInputWidthCh(endTimeInput, defaultEndTimeLabel);

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

  const clearTimeBlurCancelTimeout = () => {
    if (timeBlurCancelTimeoutRef.current !== null) {
      window.clearTimeout(timeBlurCancelTimeoutRef.current);
      timeBlurCancelTimeoutRef.current = null;
    }
  };

  const scheduleTimeBlurCancel = (which: "start" | "end") => {
    clearTimeBlurCancelTimeout();
    timeBlurCancelTimeoutRef.current = window.setTimeout(() => {
      timeBlurCancelTimeoutRef.current = null;
      if (which === "start") {
        setStartSuggestionsOpen(false);
      } else {
        setEndSuggestionsOpen(false);
      }
      cancelTimeEntryIfEmpty();
    }, 120);
  };

  const commitStartTime = (hour: number, minute: number) => {
    const next = new Date(resolvedAt);
    next.setHours(hour, minute, 0, 0);
    onDateTimeChange(next);
    onScheduledTimeChange(true);
    setStartTimeInput(formatTimeLabel(resolvedAt, hour, minute));
    timeEntryCancelStateRef.current = {
      hasScheduledTime: true,
      startTimeInput: formatTimeLabel(resolvedAt, hour, minute),
      endTimeInput: timeEntryCancelStateRef.current.endTimeInput,
    };
    setTimeInputError(null);
    setStartSuggestionsOpen(false);
    clearTimeBlurCancelTimeout();
    skipNextStartTimeBlurApplyRef.current = true;
    startTimeInputRef.current?.blur();
  };

  const commitEndTime = (hour: number, minute: number) => {
    onDurationChange(durationFromEndTime(resolvedAt, hour, minute));
    onScheduledTimeChange(true);
    setEndTimeInput(formatTimeLabel(resolvedAt, hour, minute));
    timeEntryCancelStateRef.current = {
      hasScheduledTime: true,
      startTimeInput: timeEntryCancelStateRef.current.startTimeInput,
      endTimeInput: formatTimeLabel(resolvedAt, hour, minute),
    };
    setTimeInputError(null);
    setEndSuggestionsOpen(false);
    clearTimeBlurCancelTimeout();
    skipNextEndTimeBlurApplyRef.current = true;
    endTimeInputRef.current?.blur();
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

  const clearScheduledTime = () => {
    const dateOnly = new Date(resolvedAt);
    dateOnly.setHours(0, 0, 0, 0);
    onDateTimeChange(dateOnly);
    onScheduledTimeChange(false);
    setTimeEntryActive(false);
    setStartTimeInput("");
    setEndTimeInput("");
    setTimeInputError(null);
    setStartSuggestionsOpen(false);
    setEndSuggestionsOpen(false);
  };

  const cancelTimeEntryIfEmpty = () => {
    const {
      hasScheduledTime: scheduled,
      startTimeInput: start,
      endTimeInput: end,
    } = timeEntryCancelStateRef.current;
    if (scheduled) {
      return;
    }
    if (start.trim() || end.trim()) {
      return;
    }

    const active = document.activeElement;
    if (active === startTimeInputRef.current || active === endTimeInputRef.current) {
      return;
    }

    setTimeEntryActive(false);
    setStartTimeInput("");
    setEndTimeInput("");
    setTimeInputError(null);
    setStartSuggestionsOpen(false);
    setEndSuggestionsOpen(false);
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
      className={cn("scroll-mt-28", isDragging && "opacity-50")}
      onClick={onFocus}
      data-timepoint-row
      data-timepoint-id={id}
    >
      <div
        className="rounded-[8px] bg-white transition-[box-shadow] duration-150 ease-out"
        style={{
          boxShadow: isHighlighted
            ? HIGHLIGHTED_SURFACE_SHADOW
            : isSurfaceHovered
              ? SURFACE_SHADOW_HOVER
              : SURFACE_SHADOW,
        }}
        data-highlighted={isHighlighted || undefined}
        onMouseEnter={() => setIsSurfaceHovered(true)}
        onMouseLeave={() => setIsSurfaceHovered(false)}
      >
        <div className="timepoint-event-card group overflow-hidden rounded-[8px] border-0 p-3 transition-colors duration-150">
      <motion.div
        className="relative"
        initial={
          animateEnter && !shouldReduceMotion
            ? { opacity: 0, y: 6 }
            : false
        }
        animate={{ opacity: 1, y: 0 }}
        transition={{
          y: { type: "spring", visualDuration: 0.42, bounce: 0 },
          opacity: { type: "spring", visualDuration: 0.38, bounce: 0 },
        }}
      >
        {onDelete && (
          <button
            type="button"
            aria-label="Delete timepoint"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="pointer-events-none absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-md text-[#a8adb5] opacity-0 transition-opacity duration-150 hover:bg-[#f0f0eb] hover:text-[#6b6b74] group-hover:pointer-events-auto group-hover:opacity-100"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
        {!isAnchor && (
          <div
            aria-label="Drag to reorder"
            className="absolute right-3 top-3 z-10 h-6 w-6 shrink-0 cursor-grab"
            {...attributes}
            {...listeners}
          />
        )}

        <div className={cn("min-w-0 space-y-0", !isAnchor && "pr-10")}>
          <Input
            ref={nameInputRef}
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder={isAnchor ? "Add first event name" : "Add event name"}
            className="h-8 min-w-0 w-full border-0 bg-transparent px-1 py-0 text-[15px] font-normal text-[#161616]/70 shadow-none transition-colors duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] hover:text-[#161616] focus:text-[#161616] focus-visible:ring-0 placeholder:text-[#a8adb5] hover:placeholder:text-[#8f959e] focus:placeholder:text-[#8f959e] [&::placeholder]:transition-[color_150ms_cubic-bezier(0.33,1,0.68,1)]"
            onFocus={onFocus}
            aria-label={isAnchor ? "Add first event name" : "Add event name"}
          />

          <div className="flex flex-col gap-0 pr-3 pb-0 pt-[0px]">
            {!isAnchor && (
            <motion.div
              className="flex items-start"
              initial={false}
              animate={
                relativeDatesPulseActive && !shouldReduceMotion
                  ? { opacity: [1, 0.55, 1] }
                  : { opacity: 1 }
              }
              transition={optimizeValueTransition}
              onAnimationComplete={() => setRelativeDatesPulseActive(false)}
            >
              <Plus className="h-3.5 w-3.5 shrink-0 mr-[9px] mt-[9px] text-[#a8adb5]" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-center text-[14px] font-normal text-[#161616]">
              {isCustomMode ? (
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
                        "block h-8 !w-auto min-w-0 max-w-full border-0 bg-transparent px-1 py-0 text-left text-[14px] font-normal shadow-none [field-sizing:content] hover:bg-[#f4f4f0] focus:bg-[#f4f4f0] focus-visible:ring-0 rounded-[4px]",
                        relativeSuggestionsOpen && "bg-[#f4f4f0]",
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
                          className="flex w-full cursor-pointer items-center rounded-sm px-2.5 py-2 text-left text-sm outline-none hover:bg-accent"
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
                      "inline-flex h-8 min-w-0 max-w-[16rem] items-center rounded-[4px] px-1 text-[14px] font-normal whitespace-nowrap text-[#161616] hover:bg-[#f0f0eb]",
                      relativeToPickerOpen && "bg-[#f0f0eb]",
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
                      className={relativePickerOptionClassName(relativeToMode === "default")}
                      onMouseEnter={() => setRelativeToMenuLevel("first")}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onRelativeReferenceChange(null);
                        closeRelativeToPicker();
                      }}
                    >
                      <span>First event</span>
                      <RelativePickerCheck selected={relativeToMode === "default"} />
                    </button>
                    <button
                      type="button"
                      className={relativePickerOptionClassName(relativeToMode === "previous")}
                      onMouseEnter={() => setRelativeToMenuLevel("first")}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onRelativeReferenceChange(RELATIVE_TO_PREVIOUS);
                        closeRelativeToPicker();
                      }}
                    >
                      <span>previous event</span>
                      <RelativePickerCheck selected={relativeToMode === "previous"} />
                    </button>
                    {relativeReferenceOptions.length > 0 && (
                      <button
                        ref={setRelativeToSpecificItemEl}
                        type="button"
                        className={relativePickerOptionClassName(relativeToMode === "specific")}
                        onMouseEnter={() => setRelativeToMenuLevel("specific")}
                      >
                        <span>specific event</span>
                        <span className="flex shrink-0 items-center gap-1">
                          <RelativePickerCheck selected={relativeToMode === "specific"} />
                          <ChevronRight className="h-3.5 w-3.5 text-[#6b6b74]" />
                        </span>
                      </button>
                    )}
                  </AnchoredList>

                  <AnchoredList
                    open={relativeToPickerOpen && relativeToMenuLevel === "specific"}
                    anchorEl={relativeToSpecificItemEl}
                    panelRef={relativeToSpecificPanelRef}
                    placement="right"
                    width={192}
                  >
                    {relativeReferenceOptions.map((option) => {
                      const isSelected =
                        relativeToMode === "specific" && option.id === selectedRelativeReferenceId;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={relativePickerOptionClassName(isSelected)}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onRelativeReferenceChange(option.id);
                            closeRelativeToPicker();
                          }}
                        >
                          <span className="truncate">{option.label}</span>
                          <RelativePickerCheck selected={isSelected} />
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
                        "block h-8 !w-auto min-w-0 max-w-full border-0 bg-transparent px-0 py-0 text-left text-[13px] font-normal shadow-none [field-sizing:content] hover:bg-[#f4f4f0] focus:bg-[#f4f4f0] focus-visible:ring-0 rounded-[4px]",
                        relativeSuggestionsOpen && "bg-[#f4f4f0]",
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
                          className="flex w-full cursor-pointer items-center rounded-sm px-2.5 py-2 text-left text-sm outline-none hover:bg-accent"
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
                {isActive && relativeOffsetError && (
                  <p className="text-xs text-red-600">{relativeOffsetError}</p>
                )}
              </div>
            </motion.div>
            )}
            <div className="min-w-0 flex-1">
            <div className="flex min-h-8 flex-nowrap items-center gap-0 text-sm font-normal" onClick={(event) => event.stopPropagation()}>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-8 w-fit shrink-0 justify-start whitespace-nowrap border-0 bg-transparent pl-1 pr-1 py-0 text-[13px] font-normal shadow-none hover:bg-[#f0f0eb]",
                      "text-[#161616]",
                    )}
                    aria-label="Choose event day"
                  >
                    {formattedDateLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto overflow-hidden rounded-[12px] !bg-white p-0"
                  align="start"
                  collisionPadding={8}
                >
                  <Calendar
                    mode="single"
                    selected={resolvedAt}
                    defaultMonth={resolvedAt}
                    onSelect={handleCalendarDateSelect}
                    className="bg-white"
                  />
                </PopoverContent>
              </Popover>
              <div className="inline-flex h-8 shrink-0 items-center">
              <AnimatePresence initial={false} mode="popLayout">
                {timeEntryActive ? (
                  <motion.div
                    key="time-inputs"
                    className="group/time inline-flex items-center whitespace-nowrap"
                    initial={shouldReduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
                    transition={fieldRevealOpacityTransition}
                  >
                  <span className="px-1 text-[14px] text-[#d4d4d0]">|</span>
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
                        if (skipNextStartTimeBlurApplyRef.current) {
                          skipNextStartTimeBlurApplyRef.current = false;
                        } else {
                          applyStartTimeInput();
                        }
                        scheduleTimeBlurCancel("start");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          applyStartTimeInput();
                          setStartSuggestionsOpen(false);
                          clearTimeBlurCancelTimeout();
                          skipNextStartTimeBlurApplyRef.current = true;
                          startTimeInputRef.current?.blur();
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
                      {filteredStartTimeOptions.map((option) => {
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
                  <span className="px-1 text-[14px] text-[#161616]">-</span>
                  <div ref={setEndTimeAnchorEl} className="relative h-8 w-fit">
                    <Input
                      ref={endTimeInputRef}
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
                        if (skipNextEndTimeBlurApplyRef.current) {
                          skipNextEndTimeBlurApplyRef.current = false;
                        } else {
                          applyEndTimeInput();
                        }
                        scheduleTimeBlurCancel("end");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          applyEndTimeInput();
                          setEndSuggestionsOpen(false);
                          clearTimeBlurCancelTimeout();
                          skipNextEndTimeBlurApplyRef.current = true;
                          endTimeInputRef.current?.blur();
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
                      {filteredEndTimeOptions.map((option) => {
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
                  {hasScheduledTime ? (
                    <button
                      type="button"
                      aria-label="Remove time"
                      className="ml-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#a8adb5] opacity-0 transition-opacity duration-150 hover:bg-[#f0f0eb] hover:text-[#6b6b74] group-hover/time:opacity-100 focus-visible:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        clearScheduledTime();
                      }}
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  ) : null}
                  </motion.div>
                ) : (
                  <motion.div
                    key="time-trigger"
                    initial={shouldReduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
                    transition={fieldRevealOpacityTransition}
                  >
                <button
                  type="button"
                  className="inline-flex h-8 shrink-0 items-center whitespace-nowrap bg-transparent px-2 text-[12px] font-medium text-[#a8adb5] hover:text-[#8f959e]"
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
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </div>
                {isActive && timeInputError && (
                  <p className="text-xs text-red-600">{timeInputError}</p>
                )}
              </div>
            <AnimatePresence initial={false}>
              {(isActive || Boolean(description.trim())) && (
                <motion.div
                  key="description-row"
                  initial={
                    shouldReduceMotion || skipDescriptionEnterAnimation
                      ? false
                      : { opacity: 0, height: 0 }
                  }
                  animate={{ opacity: 1, height: "auto" }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={fieldRevealTransition}
                  style={{ overflow: "hidden" }}
                >
                  <div className="flex items-start pt-1">
                    <div className="min-w-0 flex-1 flex items-start">
                      {!showDescriptionInput ? (
                        <button
                          type="button"
                          className="inline-flex h-8 min-w-0 flex-1 items-center bg-transparent px-1 text-left text-[13px] font-normal text-[#a8adb5] hover:text-[#8f959e]"
                          onClick={(event) => {
                            event.stopPropagation();
                            setShowDescriptionInput(true);
                            requestAnimationFrame(() => {
                              descriptionInputRef.current?.focus();
                            });
                          }}
                        >
                          Add description
                        </button>
                      ) : (
                        <textarea
                          ref={descriptionInputRef}
                          value={description}
                          placeholder="Add description"
                          rows={1}
                          autoComplete="off"
                          data-1p-ignore=""
                          data-lpignore="true"
                          data-form-type="other"
                          className="mx-1 block min-h-8 min-w-0 flex-1 resize-none border-0 bg-transparent px-0 pr-2 py-[6px] text-[13px] font-normal leading-5 text-[#161616] shadow-none outline-none placeholder:text-[#a8adb5] focus-visible:ring-0 [field-sizing:content]"
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
        </div>
      </div>
    </div>
  );
}
