import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Sparkles, Eraser } from "lucide-react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { defaultEventLabel, RELATIVE_TO_PREVIOUS, type OffsetMode, type Series } from "@/lib/types";
import {
  computeAuthorOffsetMinutes,
  computeDisplayOffsetMinutes,
  effectiveRelativeToTimepointId,
  resolveSeriesDates,
} from "@/lib/timepointMath";
import { AvoidWeekendsButton, isOptimizeSuccessMessage } from "@/components/editor/AvoidWeekendsButton";
import { TimepointRow } from "@/components/editor/TimepointRow";
import { OffsetModeToggle } from "@/components/editor/OffsetModeToggle";
import { PresetsMenu } from "@/components/presets/PresetsMenu";
import type { ProtocolPreset } from "@/lib/presets/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const OPTIMIZE_MESSAGE_MS = 5000;
const TOOLTIP_CONTENT_CLASS = "border-0 bg-[#161616] text-white";
const ADD_EVENT_PRESS_SCALE = 0.985;
const ADD_EVENT_PRESS_TRANSITION = { type: "spring", visualDuration: 0.18, bounce: 0.12 } as const;
const MotionButton = motion.create(Button);

type TimepointEditorProps = {
  series: Series | null;
  mode: OffsetMode;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  onScrollContainerScroll?: (scrollTop: number) => void;
  showTopBarFade?: boolean;
  highlightedTimepointId?: string | null;
  onModeChange: (mode: OffsetMode) => void;
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
  onClearAllTimepoints?: () => void;
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
  onClearAllTimepoints,
  optimizePulseKey = 0,
}: TimepointEditorProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeTimepointId, setActiveTimepointId] = useState<string | null>(null);
  const [nameFocusTimepointId, setNameFocusTimepointId] = useState<string | null>(null);
  const [descriptionEnterSkipId, setDescriptionEnterSkipId] = useState<string | null>(null);
  const [addAnimationKey, setAddAnimationKey] = useState(0);
  const [optimizeMessage, setOptimizeMessage] = useState<string | null>(null);
  const [isAddTimepointPressed, setIsAddTimepointPressed] = useState(false);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const pendingNameFocusRef = useRef(false);
  const pendingScrollTimepointIdRef = useRef<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!optimizeMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => setOptimizeMessage(null), OPTIMIZE_MESSAGE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [optimizeMessage]);

  const handleOptimizeMessage = (message: string) => {
    setOptimizeMessage(message);
    scrollContainerRef?.current?.scrollTo({ top: 0, behavior: shouldReduceMotion ? "auto" : "smooth" });
  };

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "e" && event.key !== "E") {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }
      if (target.closest('[role="dialog"]')) {
        return;
      }

      event.preventDefault();
      setIsAddTimepointPressed(true);
      handleAddTimepoint();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "e" || event.key === "E") {
        setIsAddTimepointPressed(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [onAddTimepoint]);

  if (!series) {
    return (
      <p className="py-12 text-center text-muted-foreground">Create or select a series to start editing.</p>
    );
  }

  const resolved = resolveSeriesDates(series);
  const hasAdditionalEvents = series.timepoints.length > 1;

  const handleClearAllConfirm = () => {
    onClearAllTimepoints?.();
    setClearAllOpen(false);
  };

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
          "relative z-20 flex shrink-0 flex-col gap-2 bg-[#f9f9f7] px-3 pb-0",
          showTopBarFade && "shadow-[0_4px_12px_-8px_rgba(0,0,0,0.1)]",
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <OffsetModeToggle value={mode} onChange={onModeChange} />
            <PresetsMenu series={series} offsetMode={mode} onApplyPreset={onApplyPreset} />
            {onApplyWeekendAvoidance ? (
              <AvoidWeekendsButton
                series={series}
                onApply={onApplyWeekendAvoidance}
                onMessage={handleOptimizeMessage}
              />
            ) : null}
          </div>
          {hasAdditionalEvents && onClearAllTimepoints ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  onClick={() => setClearAllOpen(true)}
                  aria-label="Clear all events"
                  className="h-8 w-8 shrink-0 rounded-[12px] border-0 bg-[#f0f0eb] text-[#161616] shadow-none hover:bg-[#e8e8e4] hover:text-[#161616]"
                >
                  <Eraser className="h-4 w-4 text-[#161616]" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent className={TOOLTIP_CONTENT_CLASS}>Clear all events</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={(event) => onScrollContainerScroll?.(event.currentTarget.scrollTop)}
        className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto px-3 pb-8 pt-3"
      >
        <AnimatePresence initial={false}>
          {optimizeMessage ? (
            <motion.div
              key={optimizeMessage}
              initial={shouldReduceMotion ? false : { opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
              className="pointer-events-none absolute inset-x-0 top-1 z-10 flex justify-center px-3"
              role="status"
              aria-live="polite"
            >
              <span className="pointer-events-auto flex items-center gap-1.5 rounded-[8px] bg-white px-3 py-2 text-[13px] font-medium whitespace-nowrap text-[#161616] shadow-[0_4px_12px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)]">
                {isOptimizeSuccessMessage(optimizeMessage) ? (
                  <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : null}
                {optimizeMessage}
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="flex flex-col gap-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={series.timepoints.map((timepoint) => timepoint.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2 overflow-visible">
              {series.timepoints.map((timepoint, index) => {
                const referenceId = effectiveRelativeToTimepointId(series, timepoint, index, mode);
                const referenceIndex = series.timepoints.findIndex((candidate) => candidate.id === referenceId);
                const resolvedReferenceIndex = referenceIndex >= 0 ? referenceIndex : 0;
                const referenceTimepoint =
                  referenceIndex >= 0 ? series.timepoints[referenceIndex] : series.timepoints[0];
                const relativeReferenceOptions = series.timepoints
                  .slice(0, index)
                  .map((candidate, candidateIndex) => ({
                    id: candidate.id,
                    label: candidate.name.trim() || defaultEventLabel(candidateIndex),
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
                    referenceTimepoint?.name.trim() || defaultEventLabel(resolvedReferenceIndex)
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
          <MotionButton
            type="button"
            variant="ghost"
            data-add-timepoint-button
            className={cn(
              "h-12 w-full cursor-pointer gap-2 rounded-[12px] bg-[#f0f0eb] text-[12px] font-medium tracking-[0.16px] text-[#161616] transition-colors duration-100 hover:bg-[#e8e8e4] hover:text-[#161616] active:bg-[#e8e8e4]",
              isAddTimepointPressed && "bg-[#e8e8e4]",
            )}
            animate={
              shouldReduceMotion ? undefined : { scale: isAddTimepointPressed ? ADD_EVENT_PRESS_SCALE : 1 }
            }
            whileTap={shouldReduceMotion ? undefined : { scale: ADD_EVENT_PRESS_SCALE }}
            transition={ADD_EVENT_PRESS_TRANSITION}
            onClick={handleAddTimepoint}
          >
            + Add event
            <Kbd className="h-4 min-w-4 px-0.5 text-[10px] text-[#6b6b74]">e</Kbd>
          </MotionButton>
        </motion.div>
        </div>
      </div>

      <Dialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Clear all events?</DialogTitle>
            <DialogDescription>
              This will remove all events and reset your protocol. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setClearAllOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleClearAllConfirm}>
              Clear all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
