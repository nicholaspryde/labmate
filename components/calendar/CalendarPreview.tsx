"use client";

import {
  IlamyCalendar,
  useIlamyCalendarContext,
  type CalendarEvent,
} from "@ilamy/calendar";
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import "@/lib/dayjs";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { formatCalendarPreviewLabel, type CalendarEventData } from "@/lib/calendarMapping";
import { dayDeltaFromDates } from "@/lib/timepointMath";
import { cn } from "@/lib/utils";

type CalendarPreviewProps = {
  events: Parameters<typeof IlamyCalendar>[0]["events"];
  focusDate: string | null;
  highlightedTimepointId: string | null;
  onHoverTimepoint: (timepointId: string | null) => void;
  onShiftSeriesDays: (seriesId: string, deltaDays: number) => void;
};

const DEFAULT_ACCENT = "#6c96ff";

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
  const eventStartsRef = useRef<Map<string, Date>>(new Map());

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const headerComponent = useMemo(() => <CalendarHeader />, []);

  return (
    <div
      className={cn(
        "flex h-[calc(100vh-3rem)] min-h-0 flex-col overflow-hidden rounded-[12px] border border-[#e3e3e3] bg-white",
      )}
      style={{
        boxShadow:
          "0px 3px 6px -2px lch(0% 0 0 / 0.02), 0px 1px 1px lch(0% 0 0 / 0.04)",
      }}
    >
      <div className="min-h-0 flex-1">
        {mounted ? (
          <IlamyCalendar
            key={focusDate ?? "default"}
            events={events}
            initialView="month"
            initialDate={focusDate ?? undefined}
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
            headerClassName="px-8 py-4 border-b border-[#f4f4f4]"
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
  );
}

export const CalendarPreview = memo(CalendarPreviewImpl);
