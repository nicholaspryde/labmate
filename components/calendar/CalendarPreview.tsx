"use client";

import { IlamyCalendar, type CalendarEvent } from "@ilamy/calendar";
import { useEffect, useRef, useState } from "react";
import "@/lib/dayjs";
import { formatCalendarPreviewLabel, type CalendarEventData } from "@/lib/calendarMapping";
import { dayDeltaFromDates } from "@/lib/timepointMath";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CalendarPreviewProps = {
  events: Parameters<typeof IlamyCalendar>[0]["events"];
  focusDate: string | null;
  onShiftSeriesDays: (seriesId: string, deltaDays: number) => void;
};

export function CalendarPreview({ events, focusDate, onShiftSeriesDays }: CalendarPreviewProps) {
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

  return (
    <Card className="flex h-[calc(100vh-3rem)] min-h-0 flex-col">
      <CardHeader className="shrink-0">
        <CardTitle className="text-base">Calendar Preview</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <div className="h-full min-h-0">
          {mounted ? (
            <IlamyCalendar
              key={focusDate ?? "default"}
              events={events}
              initialView="month"
              initialDate={focusDate ?? undefined}
              disableCellClick
              disableEventClick
              onEventUpdate={handleEventUpdate}
              renderEvent={(event) => {
                const eventData = event.data as CalendarEventData | undefined;
                const timeLabel = eventData?.timeLabel;
                const previewTitle = eventData ? formatCalendarPreviewLabel(eventData) : event.title;
                return (
                  <div
                    className="truncate px-1 text-xs"
                    title={timeLabel ? `${previewTitle} (${timeLabel})` : previewTitle}
                  >
                    {previewTitle}
                  </div>
                );
              }}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
