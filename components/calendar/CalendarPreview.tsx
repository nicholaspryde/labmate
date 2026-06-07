"use client";

import {
  IlamyCalendar,
  useIlamyCalendarContext,
  type CalendarEvent,
} from "@ilamy/calendar";
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import dayjs from "@/lib/dayjs";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { formatCalendarPreviewLabel, type CalendarEventData } from "@/lib/calendarMapping";
import { dayDeltaFromDates } from "@/lib/timepointMath";
import { cn, SURFACE_SHADOW } from "@/lib/utils";

export type CalendarEventDayChange = {
  seriesId: string;
  timepointId: string;
  isAnchor: boolean;
  newStart: Date;
  deltaDays: number;
};

type CalendarPreviewProps = {
  events: Parameters<typeof IlamyCalendar>[0]["events"];
  focusDate: string | null;
  highlightedTimepointId: string | null;
  onHoverTimepoint: (timepointId: string | null) => void;
  onEventDayChange: (change: CalendarEventDayChange) => void;
};

const DEFAULT_ACCENT = "#6c96ff";
/** ilamy entrance stagger (0.05s × ~7) + 0.2s motion duration */
const CALENDAR_ENTRANCE_MS = 400;

function CalendarFocusDateSync({ focusDate }: { focusDate: string | null }) {
  const { setCurrentDate } = useIlamyCalendarContext();

  // Only follow editor anchor changes — do not depend on currentDate or we reset
  // prev/next navigation back to the anchor month on every click.
  useEffect(() => {
    if (!focusDate) {
      return;
    }
    const next = dayjs(focusDate);
    if (!next.isValid()) {
      return;
    }
    setCurrentDate(next);
  }, [focusDate, setCurrentDate]);

  return null;
}

type EventChipProps = {
  event: CalendarEvent;
  highlightedTimepointId: string | null;
  onHoverTimepoint: (timepointId: string | null) => void;
};

function EventChip({ event, highlightedTimepointId, onHoverTimepoint }: EventChipProps) {
  const { view } = useIlamyCalendarContext();
  const eventData = event.data as CalendarEventData | undefined;
  const accent = eventData?.accentColor ?? DEFAULT_ACCENT;
  const chipStyle: CSSProperties & Record<"--event-accent", string> = {
    "--event-accent": accent,
  };
  const timepointId = eventData?.timepointId;
  const timeLabel = eventData?.timeLabel;
  const previewTitle = eventData ? formatCalendarPreviewLabel(eventData) : event.title;
  const titleOnly = eventData?.timepointName?.trim() || previewTitle;
  const isHighlighted =
    Boolean(timepointId) && timepointId === highlightedTimepointId;
  const isCompact = view === "month" || view === "year";

  const handleMouseEnter = () => {
    if (timepointId) onHoverTimepoint(timepointId);
  };
  const handleMouseLeave = () => onHoverTimepoint(null);
  const tooltip = timeLabel ? `${previewTitle} (${timeLabel})` : previewTitle;

  if (isCompact) {
    return (
      <div
        className={cn(
          "calendar-event-chip calendar-event-chip--compact",
          isHighlighted && "calendar-event-chip--highlighted",
        )}
        style={chipStyle}
        title={tooltip}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {timeLabel ? (
          <span className="calendar-event-chip__time">{timeLabel}</span>
        ) : null}
        <span className="calendar-event-chip__title">{titleOnly}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "calendar-event-chip",
        isHighlighted && "calendar-event-chip--highlighted",
      )}
      style={chipStyle}
      title={tooltip}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="calendar-event-chip__title">{previewTitle}</div>
      {timeLabel ? (
        <div className="calendar-event-chip__time">{timeLabel}</div>
      ) : null}
    </div>
  );
}

function CalendarPreviewImpl({
  events,
  focusDate,
  highlightedTimepointId,
  onHoverTimepoint,
  onEventDayChange,
}: CalendarPreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [entranceComplete, setEntranceComplete] = useState(false);
  const calendarShellRef = useRef<HTMLDivElement>(null);
  const eventStartsRef = useRef<Map<string, Date>>(new Map());
  const isCalendarEventDragRef = useRef(false);
  const initialDateRef = useRef(focusDate);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    const timeoutId = window.setTimeout(() => setEntranceComplete(true), CALENDAR_ENTRANCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [mounted]);

  useEffect(() => {
    const starts = new Map<string, Date>();
    for (const event of events ?? []) {
      const start = event.start instanceof Date ? event.start : new Date(String(event.start));
      starts.set(String(event.id), start);
    }
    eventStartsRef.current = starts;
  }, [events]);

  useEffect(() => {
    const shell = calendarShellRef.current;
    if (!shell) {
      return;
    }

    const setDragAccent = (accent: string) => {
      shell.style.setProperty("--calendar-drag-accent", accent);
    };

    const clearDragAccent = () => {
      shell.style.removeProperty("--calendar-drag-accent");
    };

    const suppressDragDropAnimation = () => {
      const calendar = shell.querySelector('[data-testid="ilamy-calendar"]');
      if (!calendar) {
        return;
      }

      for (const preview of calendar.querySelectorAll("div.bg-amber-200")) {
        if (!(preview instanceof HTMLElement)) {
          continue;
        }
        let node: HTMLElement | null = preview;
        while (node && node !== calendar) {
          if (getComputedStyle(node).position === "fixed") {
            for (const animation of node.getAnimations()) {
              animation.cancel();
            }
            node.style.visibility = "hidden";
            break;
          }
          node = node.parentElement;
        }
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const chip = (event.target as HTMLElement | null)?.closest(".calendar-event-chip");
      if (!chip) {
        return;
      }
      isCalendarEventDragRef.current = true;
      const accent = getComputedStyle(chip).getPropertyValue("--event-accent").trim();
      if (accent) {
        setDragAccent(accent);
      }
    };

    const handlePointerUp = () => {
      clearDragAccent();
      if (!isCalendarEventDragRef.current) {
        return;
      }
      isCalendarEventDragRef.current = false;
      suppressDragDropAnimation();
      requestAnimationFrame(suppressDragDropAnimation);
    };

    shell.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);

    return () => {
      shell.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
      clearDragAccent();
    };
  }, [mounted]);

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    const oldStart = eventStartsRef.current.get(String(updatedEvent.id));
    const eventData = updatedEvent.data as CalendarEventData | undefined;
    const seriesId = eventData?.seriesId;
    const timepointId = eventData?.timepointId;
    if (!oldStart || !seriesId || !timepointId) {
      return;
    }

    const newStart = updatedEvent.start.toDate();
    const deltaDays = dayDeltaFromDates(oldStart, newStart);
    if (deltaDays === 0) {
      return;
    }

    onEventDayChange({
      seriesId,
      timepointId,
      isAnchor: eventData.timepointNumber === 1,
      newStart,
      deltaDays,
    });
  };

  const headerComponent = useMemo(
    () => (
      <>
        <CalendarFocusDateSync focusDate={focusDate} />
        <CalendarHeader />
      </>
    ),
    [focusDate],
  );

  return (
    <div className="rounded-[24px]" style={{ boxShadow: SURFACE_SHADOW }}>
      <div
        ref={calendarShellRef}
        data-calendar-static={entranceComplete || undefined}
        className={cn(
          "flex h-[calc(100vh-3rem)] min-h-0 flex-col overflow-hidden rounded-[24px] border-0 bg-white",
        )}
      >
      <div className="min-h-0 flex-1">
        {mounted ? (
          <IlamyCalendar
            events={events}
            initialView="month"
            initialDate={initialDateRef.current ?? undefined}
            disableCellClick
            disableEventClick
            dayMaxEvents={4}
            eventHeight={22}
            eventSpacing={2}
            classesOverride={{
              disabledCell: "bg-[#f6f5f2] text-[#cdcac5] pointer-events-none",
            }}
            onEventUpdate={handleEventUpdate}
            headerComponent={headerComponent}
            headerClassName="px-8 py-4 border-0 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.04)]"
            renderEvent={(event) => (
              <EventChip
                event={event}
                highlightedTimepointId={highlightedTimepointId}
                onHoverTimepoint={onHoverTimepoint}
              />
            )}
          />
        ) : null}
      </div>
      </div>
    </div>
  );
}

export const CalendarPreview = memo(CalendarPreviewImpl);
