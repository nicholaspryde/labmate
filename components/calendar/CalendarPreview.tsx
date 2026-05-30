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

type CalendarPreviewProps = {
  events: Parameters<typeof IlamyCalendar>[0]["events"];
  focusDate: string | null;
  highlightedTimepointId: string | null;
  onHoverTimepoint: (timepointId: string | null) => void;
  onShiftSeriesDays: (seriesId: string, deltaDays: number) => void;
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
  const accent = event.color || event.backgroundColor || DEFAULT_ACCENT;
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
  onShiftSeriesDays,
}: CalendarPreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [entranceComplete, setEntranceComplete] = useState(false);
  const eventStartsRef = useRef<Map<string, Date>>(new Map());
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

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    const oldStart = eventStartsRef.current.get(String(updatedEvent.id));
    const seriesId = (updatedEvent.data as CalendarEventData | undefined)?.seriesId;
    if (!oldStart || !seriesId) {
      return;
    }

    const delta = dayDeltaFromDates(oldStart, updatedEvent.start.toDate());
    if (delta !== 0) {
      onShiftSeriesDays(seriesId, delta);
    }
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
            disableDragAndDrop
            dayMaxEvents={4}
            eventHeight={22}
            eventSpacing={2}
            classesOverride={{
              disabledCell: "bg-[#fafbfc] text-[#c5c8cd] pointer-events-none",
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
