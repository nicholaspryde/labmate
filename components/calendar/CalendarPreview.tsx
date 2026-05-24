"use client";

import { useEffect, useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventDropArg, EventInput } from "@fullcalendar/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dayDeltaFromDates } from "@/lib/timepointMath";

type CalendarPreviewProps = {
  events: EventInput[];
  focusDate: string | null;
  onShiftSeriesDays: (seriesId: string, deltaDays: number) => void;
};

export function CalendarPreview({ events, focusDate, onShiftSeriesDays }: CalendarPreviewProps) {
  const calendarRef = useRef<FullCalendar | null>(null);

  useEffect(() => {
    if (!focusDate) {
      return;
    }
    calendarRef.current?.getApi().gotoDate(focusDate);
  }, [focusDate]);

  const memoEvents = useMemo(() => events, [events]);

  const handleDrop = (arg: EventDropArg) => {
    const oldStart = arg.oldEvent.start;
    const newStart = arg.event.start;
    const seriesId = String(arg.event.extendedProps.seriesId ?? "");
    if (!oldStart || !newStart || !seriesId) {
      arg.revert();
      return;
    }
    const delta = dayDeltaFromDates(oldStart, newStart);
    if (delta === 0) {
      return;
    }
    onShiftSeriesDays(seriesId, delta);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Calendar Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          editable
          events={memoEvents}
          eventDrop={handleDrop}
          headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
          eventDidMount={(info) => {
            info.el.title = `${info.event.title} (${info.event.extendedProps.timeLabel})`;
          }}
          height="auto"
        />
      </CardContent>
    </Card>
  );
}
