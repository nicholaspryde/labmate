import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useState } from "react";
import type { OffsetMode, Series } from "@/lib/types";
import { computeOffsetFromPrevious, resolveSeriesDates } from "@/lib/timepointMath";
import { TimepointRow } from "@/components/editor/TimepointRow";
import { OffsetModeToggle } from "@/components/editor/OffsetModeToggle";
import { ExportDialog } from "@/components/export/ExportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type TimepointEditorProps = {
  series: Series | null;
  mode: OffsetMode;
  onModeChange: (mode: OffsetMode) => void;
  onSeriesNameChange: (name: string) => void;
  onAnchorDateTimeChange: (anchorAt: string) => void;
  onAddTimepoint: () => void;
  onDeleteTimepoint: (timepointId: string) => void;
  onReorderTimepoint: (fromIndex: number, toIndex: number) => void;
  onTimepointNameChange: (timepointId: string, name: string) => void;
  onTimepointDescriptionChange: (timepointId: string, description: string) => void;
  onTimepointScheduledTimeChange: (timepointId: string, hasScheduledTime: boolean) => void;
  onTimepointDurationChange: (timepointId: string, durationMinutes: number) => void;
  onTimepointOffsetChange: (timepointId: string, minutes: number) => void;
  onTimepointAbsoluteOffsetChange: (timepointId: string, minutesFromStart: number) => void;
};

export function TimepointEditor({
  series,
  mode,
  onModeChange,
  onSeriesNameChange,
  onAnchorDateTimeChange,
  onAddTimepoint,
  onDeleteTimepoint,
  onReorderTimepoint,
  onTimepointNameChange,
  onTimepointDescriptionChange,
  onTimepointScheduledTimeChange,
  onTimepointDurationChange,
  onTimepointOffsetChange,
  onTimepointAbsoluteOffsetChange,
}: TimepointEditorProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeTimepointId, setActiveTimepointId] = useState<string | null>(null);

  useEffect(() => {
    if (!series) {
      setActiveTimepointId(null);
      return;
    }
    if (series.timepoints.length === 0) {
      setActiveTimepointId(null);
      return;
    }
    if (!activeTimepointId || !series.timepoints.some((timepoint) => timepoint.id === activeTimepointId)) {
      setActiveTimepointId(series.timepoints[0].id);
    }
  }, [activeTimepointId, series]);

  if (!series) {
    return (
      <p className="py-12 text-center text-muted-foreground">Create or select a series to start editing.</p>
    );
  }

  const resolved = resolveSeriesDates(series);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = series.timepoints.findIndex((timepoint) => timepoint.id === active.id);
    const newIndex = series.timepoints.findIndex((timepoint) => timepoint.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    onReorderTimepoint(oldIndex, newIndex);
  };

  const handleDateTimeChange = (timepointId: string, index: number, nextDate: Date) => {
    if (index === 0) {
      onAnchorDateTimeChange(nextDate.toISOString());
      return;
    }
    const anchorDate = new Date(series.anchorAt);
    const minutesFromStart = Math.max(0, Math.round((nextDate.getTime() - anchorDate.getTime()) / 60_000));
    onTimepointAbsoluteOffsetChange(timepointId, minutesFromStart);
  };

  return (
    <div className="flex flex-col gap-8">
        <Input
          value={series.name}
          onChange={(event) => onSeriesNameChange(event.target.value)}
          aria-label="Series name"
          className="h-auto border-0 p-0 text-2xl font-normal text-[#161616] shadow-none focus-visible:ring-0"
        />

        <div className="max-w-[320px]">
          <OffsetModeToggle value={mode} onChange={onModeChange} />
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={series.timepoints.map((timepoint) => timepoint.id)} strategy={verticalListSortingStrategy}>
            <div className="flex-1 overflow-visible">
              {series.timepoints.map((timepoint, index) => (
                <TimepointRow
                  key={timepoint.id}
                  id={timepoint.id}
                  index={index + 1}
                  name={timepoint.name}
                  description={timepoint.description}
                  hasScheduledTime={timepoint.hasScheduledTime === true}
                  isAnchor={index === 0}
                  isActive={activeTimepointId === timepoint.id}
                  resolvedAt={resolved[index].resolvedAt}
                  displayOffsetMinutes={
                    mode === "from-start"
                      ? timepoint.offsetFromStartMinutes
                      : computeOffsetFromPrevious(series, index)
                  }
                  onNameChange={(value) => onTimepointNameChange(timepoint.id, value)}
                  onDescriptionChange={(value) => onTimepointDescriptionChange(timepoint.id, value)}
                  onScheduledTimeChange={(hasScheduledTime) =>
                    onTimepointScheduledTimeChange(timepoint.id, hasScheduledTime)
                  }
                  durationMinutes={timepoint.durationMinutes ?? 60}
                  onDurationChange={(durationMinutes) =>
                    onTimepointDurationChange(timepoint.id, durationMinutes)
                  }
                  onOffsetChange={(minutes) => onTimepointOffsetChange(timepoint.id, minutes)}
                  onDateTimeChange={(nextDate) => handleDateTimeChange(timepoint.id, index, nextDate)}
                  onFocus={() => setActiveTimepointId(timepoint.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-fit p-0 text-[14px] font-medium tracking-[0.16px] text-[#004cff] hover:bg-transparent hover:text-[#004cff]"
            onClick={onAddTimepoint}
          >
            Add timepoint
          </Button>
          <ExportDialog
            series={[series]}
            triggerLabel="Add to calendar"
            triggerClassName="h-10 rounded-[2px] bg-[#1d232f] px-4 text-[14px] tracking-[0.16px] hover:bg-[#161b25]"
          />
        </div>
    </div>
  );
}
