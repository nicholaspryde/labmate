import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_ANCHOR_NAME, RELATIVE_TO_PREVIOUS, type OffsetMode, type Series } from "@/lib/types";
import {
  computeAuthorOffsetMinutes,
  computeDisplayOffsetMinutes,
  effectiveRelativeToTimepointId,
  resolveSeriesDates,
} from "@/lib/timepointMath";
import { TimepointRow } from "@/components/editor/TimepointRow";
import { OffsetModeToggle } from "@/components/editor/OffsetModeToggle";
import { ExportDialog } from "@/components/export/ExportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type TimepointEditorProps = {
  series: Series | null;
  mode: OffsetMode;
  highlightedTimepointId?: string | null;
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
  onTimepointDisplayOffsetChange: (timepointId: string, minutes: number) => void;
  onTimepointAuthorOffsetChange: (timepointId: string, minutes: number) => void;
  onTimepointAbsoluteOffsetChange: (timepointId: string, minutesFromStart: number) => void;
  onTimepointRelativeReferenceChange: (timepointId: string, relativeToTimepointId: string | null) => void;
};

export function TimepointEditor({
  series,
  mode,
  highlightedTimepointId = null,
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
  onTimepointDisplayOffsetChange,
  onTimepointAuthorOffsetChange,
  onTimepointAbsoluteOffsetChange,
  onTimepointRelativeReferenceChange,
}: TimepointEditorProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeTimepointId, setActiveTimepointId] = useState<string | null>(null);
  const [nameFocusTimepointId, setNameFocusTimepointId] = useState<string | null>(null);
  const [animateTimepointId, setAnimateTimepointId] = useState<string | null>(null);
  const pendingNameFocusRef = useRef(false);
  const seriesNameInputRef = useRef<HTMLInputElement>(null);
  const hasInitialSeriesNameFocusRef = useRef(false);

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

  useLayoutEffect(() => {
    if (!series || !pendingNameFocusRef.current) {
      return;
    }

    pendingNameFocusRef.current = false;
    const newTimepoint = series.timepoints[series.timepoints.length - 1];
    if (!newTimepoint) {
      return;
    }

    setActiveTimepointId(newTimepoint.id);
    setNameFocusTimepointId(newTimepoint.id);
    setAnimateTimepointId(newTimepoint.id);
  }, [series]);

  const handleAddTimepoint = () => {
    pendingNameFocusRef.current = true;
    onAddTimepoint();
  };

  useLayoutEffect(() => {
    if (!series || hasInitialSeriesNameFocusRef.current) {
      return;
    }

    hasInitialSeriesNameFocusRef.current = true;
    const input = seriesNameInputRef.current;
    if (!input) {
      return;
    }

    input.focus();
    input.select();
  }, [series?.id]);

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
    <div className="flex flex-col">
        <div className="sticky top-0 z-10 flex flex-col gap-2 bg-background pb-4">
          <div className="flex items-center gap-3">
            <Input
              ref={seriesNameInputRef}
              value={series.name}
              onChange={(event) => onSeriesNameChange(event.target.value)}
              placeholder="Timeseries name"
              aria-label="Timeseries name"
              className="h-auto min-w-0 flex-1 border-0 bg-background p-0 text-[20px] text-[#161616] shadow-none focus-visible:ring-0 placeholder:text-[#a8adb5]"
            />
            <ExportDialog
              series={[series]}
              triggerLabel="Export to calendar"
              triggerClassName="h-8 shrink-0 rounded-[12px] px-4 text-[14px] font-medium tracking-[0.16px] text-[#161616] hover:bg-[#f5f6f8] hover:text-[#161616]"
            />
          </div>

          <OffsetModeToggle value={mode} onChange={onModeChange} />
        </div>

        <div className="flex flex-col gap-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={series.timepoints.map((timepoint) => timepoint.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2 overflow-visible">
              {series.timepoints.map((timepoint, index) => {
                const referenceId = effectiveRelativeToTimepointId(series, timepoint, index, mode);
                const referenceIndex = series.timepoints.findIndex((candidate) => candidate.id === referenceId);
                const referenceTimepoint =
                  referenceIndex >= 0 ? series.timepoints[referenceIndex] : series.timepoints[0];
                const relativeReferenceOptions = series.timepoints
                  .filter((_, candidateIndex) => candidateIndex < index)
                  .map((candidate, candidateIndex) => ({
                    id: candidate.id,
                    label:
                      candidate.name.trim() ||
                      (candidateIndex === 0 ? DEFAULT_ANCHOR_NAME : `Timepoint ${candidateIndex + 1}`),
                  }));

                const relativeToMode: "default" | "previous" | "specific" =
                  !timepoint.relativeToTimepointId
                    ? "default"
                    : timepoint.relativeToTimepointId === RELATIVE_TO_PREVIOUS
                      ? "previous"
                      : "specific";

                return (
                <TimepointRow
                  key={timepoint.id}
                  id={timepoint.id}
                  index={index + 1}
                  name={timepoint.name}
                  description={timepoint.description}
                  hasScheduledTime={timepoint.hasScheduledTime === true}
                  isAnchor={index === 0}
                  isActive={activeTimepointId === timepoint.id}
                  isHighlighted={highlightedTimepointId === timepoint.id}
                  resolvedAt={resolved[index].resolvedAt}
                  mode={mode}
                  displayOffsetMinutes={computeDisplayOffsetMinutes(series, index, mode)}
                  authorOffsetMinutes={computeAuthorOffsetMinutes(series, index, mode)}
                  relativeReferenceLabel={
                    referenceTimepoint?.name.trim() ||
                    (referenceIndex === 0 ? DEFAULT_ANCHOR_NAME : `Timepoint ${referenceIndex + 1}`)
                  }
                  relativeReferenceOptions={relativeReferenceOptions}
                  selectedRelativeReferenceId={referenceId}
                  relativeToMode={relativeToMode}
                  onNameChange={(value) => onTimepointNameChange(timepoint.id, value)}
                  onDescriptionChange={(value) => onTimepointDescriptionChange(timepoint.id, value)}
                  onScheduledTimeChange={(hasScheduledTime) =>
                    onTimepointScheduledTimeChange(timepoint.id, hasScheduledTime)
                  }
                  durationMinutes={timepoint.durationMinutes ?? 60}
                  onDurationChange={(durationMinutes) =>
                    onTimepointDurationChange(timepoint.id, durationMinutes)
                  }
                  onDisplayOffsetChange={(minutes) =>
                    onTimepointDisplayOffsetChange(timepoint.id, minutes)
                  }
                  onAuthorOffsetChange={(minutes) => onTimepointAuthorOffsetChange(timepoint.id, minutes)}
                  onRelativeReferenceChange={(relativeToTimepointId) =>
                    onTimepointRelativeReferenceChange(timepoint.id, relativeToTimepointId)
                  }
                  onDateTimeChange={(nextDate) => handleDateTimeChange(timepoint.id, index, nextDate)}
                  onFocus={() => setActiveTimepointId(timepoint.id)}
                  onDelete={index > 0 ? () => onDeleteTimepoint(timepoint.id) : undefined}
                  autoFocusName={nameFocusTimepointId === timepoint.id}
                  onNameFocusComplete={() => setNameFocusTimepointId(null)}
                  animateEnter={animateTimepointId === timepoint.id}
                />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        <Button
          type="button"
          variant="ghost"
          className="h-12 w-full rounded-[12px] text-[14px] font-medium tracking-[0.16px] text-[#161616] hover:bg-[#f5f6f8] hover:text-[#161616]"
          onClick={handleAddTimepoint}
        >
          + Timepoint
        </Button>
        </div>
    </div>
  );
}
