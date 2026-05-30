import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Download } from "lucide-react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "motion/react";
import { DEFAULT_ANCHOR_NAME, RELATIVE_TO_PREVIOUS, type OffsetMode, type Series } from "@/lib/types";
import {
  computeAuthorOffsetMinutes,
  computeDisplayOffsetMinutes,
  effectiveRelativeToTimepointId,
  resolveSeriesDates,
} from "@/lib/timepointMath";
import { AvoidWeekendsButton } from "@/components/editor/AvoidWeekendsButton";
import { TimepointRow } from "@/components/editor/TimepointRow";
import { OffsetModeToggle } from "@/components/editor/OffsetModeToggle";
import { PresetsMenu } from "@/components/presets/PresetsMenu";
import { buildIcs, triggerIcsDownload } from "@/lib/icsExport";
import type { ProtocolPreset } from "@/lib/presets/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEFAULT_EXPORT_DURATION_MINUTES = 30;
type TimepointEditorProps = {
  series: Series | null;
  mode: OffsetMode;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  onScrollContainerScroll?: (scrollTop: number) => void;
  showTopBarFade?: boolean;
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
  onApplyPreset: (preset: ProtocolPreset) => void;
  onApplyWeekendAvoidance?: (deltaDays: number) => void;
  optimizePulseKey?: number;
};

export function TimepointEditor({
  series,
  mode,
  scrollContainerRef,
  onScrollContainerScroll,
  showTopBarFade = false,
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
  onApplyPreset,
  onApplyWeekendAvoidance,
  optimizePulseKey = 0,
}: TimepointEditorProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeTimepointId, setActiveTimepointId] = useState<string | null>(null);
  const [nameFocusTimepointId, setNameFocusTimepointId] = useState<string | null>(null);
  const [descriptionEnterSkipId, setDescriptionEnterSkipId] = useState<string | null>(null);
  const [addAnimationKey, setAddAnimationKey] = useState(0);
  const pendingNameFocusRef = useRef(false);
  const pendingScrollTimepointIdRef = useRef<string | null>(null);
  const seriesNameInputRef = useRef<HTMLInputElement>(null);
  const hasInitialSeriesNameFocusRef = useRef(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!series || series.timepoints.length === 0) {
      setActiveTimepointId(null);
      return;
    }
    if (activeTimepointId && !series.timepoints.some((timepoint) => timepoint.id === activeTimepointId)) {
      setActiveTimepointId(null);
    }
  }, [activeTimepointId, series]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (
        target.closest("[data-timepoint-row]") ||
        target.closest("[data-add-timepoint-button]") ||
        target.closest("[data-anchored-list]") ||
        target.closest("[data-radix-popper-content-wrapper]")
      ) {
        return;
      }
      setActiveTimepointId(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  // Derive the newly-added timepoint id during render so that the row mounts with
  // the correct `initial` style on its very first paint — avoiding the stutter
  // you get when triggering animations from useLayoutEffect (Motion's controls.set
  // defers to the next frame, so the row would paint once at its final state, then
  // snap to the from-state, then animate).
  const newlyAddedTimepointId =
    pendingNameFocusRef.current && series && series.timepoints.length > 0
      ? series.timepoints[series.timepoints.length - 1].id
      : null;

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
    setDescriptionEnterSkipId(newTimepoint.id);
    pendingScrollTimepointIdRef.current = newTimepoint.id;
  }, [series]);

  useLayoutEffect(() => {
    const pendingScrollTimepointId = pendingScrollTimepointIdRef.current;
    if (!pendingScrollTimepointId || activeTimepointId !== pendingScrollTimepointId) {
      return;
    }

    pendingScrollTimepointIdRef.current = null;

    const scrollContainer = scrollContainerRef?.current;
    if (!scrollContainer) {
      return;
    }

    const scrollToShowAddButton = () => {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight - scrollContainer.clientHeight,
        behavior: shouldReduceMotion ? "auto" : "smooth",
      });
    };

    scrollToShowAddButton();

    setDescriptionEnterSkipId(null);

    if (shouldReduceMotion) {
      return;
    }

    const timeoutId = window.setTimeout(scrollToShowAddButton, 220);
    return () => window.clearTimeout(timeoutId);
  }, [activeTimepointId, scrollContainerRef, shouldReduceMotion]);

  const handleAddTimepoint = () => {
    pendingNameFocusRef.current = true;
    setAddAnimationKey((key) => key + 1);
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "relative z-20 flex shrink-0 flex-col gap-2 bg-[#f9f9f7] px-3 pb-4",
          showTopBarFade && "shadow-[0_4px_12px_-8px_rgba(0,0,0,0.1)]",
        )}
      >
        <div className="flex items-center gap-3">
          <Input
            ref={seriesNameInputRef}
            value={series.name}
            onChange={(event) => onSeriesNameChange(event.target.value)}
            placeholder="Timeseries name"
            aria-label="Timeseries name"
            className="h-auto min-w-0 flex-1 border-0 bg-transparent px-1 py-0 text-[20px] font-medium text-[#161616]/70 shadow-none transition-colors duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] hover:text-[#161616] focus:text-[#161616] focus-visible:ring-0 placeholder:text-[#a8adb5] hover:placeholder:text-[#8f959e] focus:placeholder:text-[#8f959e] [&::placeholder]:transition-[color_150ms_cubic-bezier(0.33,1,0.68,1)]"
          />
          <Button
            type="button"
            size="icon"
            disabled={series.timepoints.length === 0}
            onClick={() => {
              const ics = buildIcs([series], DEFAULT_EXPORT_DURATION_MINUTES);
              triggerIcsDownload(ics);
            }}
            aria-label="Export to calendar"
            className="h-8 w-8 shrink-0 rounded-[12px] border-0 bg-[#f0f0eb] text-[#161616] shadow-none hover:bg-[#e8e8e4] hover:text-[#161616]"
          >
            <Download className="h-4 w-4 text-[#161616]" aria-hidden />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <OffsetModeToggle value={mode} onChange={onModeChange} />
          <PresetsMenu series={series} offsetMode={mode} onApplyPreset={onApplyPreset} />
          {onApplyWeekendAvoidance ? (
            <AvoidWeekendsButton series={series} onApply={onApplyWeekendAvoidance} />
          ) : null}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={(event) => onScrollContainerScroll?.(event.currentTarget.scrollTop)}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 pb-8 pt-3"
      >
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
                  animateEnter={newlyAddedTimepointId === timepoint.id}
                  skipDescriptionEnterAnimation={descriptionEnterSkipId === timepoint.id}
                  optimizePulseKey={optimizePulseKey}
                />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        <motion.div
          key={addAnimationKey}
          initial={addAnimationKey > 0 && !shouldReduceMotion ? { y: -8 } : false}
          animate={{ y: 0 }}
          transition={{ type: "spring", visualDuration: 0.42, bounce: 0 }}
          style={{ willChange: "transform" }}
        >
          <Button
            type="button"
            variant="ghost"
            data-add-timepoint-button
            className="h-12 w-full cursor-pointer rounded-[12px] text-[12px] font-medium tracking-[0.16px] text-[#161616] hover:bg-[#f0f0eb] hover:text-[#161616]"
            onClick={handleAddTimepoint}
          >
            + Timepoint
          </Button>
        </motion.div>
        </div>
      </div>
    </div>
  );
}
