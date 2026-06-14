"use client";

import { Check, Download } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { SeriesTab } from "@/components/editor/SeriesTab";
import { buildIcs, triggerIcsDownload } from "@/lib/icsExport";
import type { Series } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const TOOLTIP_CONTENT_CLASS = "border-0 bg-[#161616] text-white";
const DEFAULT_EXPORT_DURATION_MINUTES = 30;
const EXPORT_SUCCESS_MS = 1200;
const SERIES_NAME_PLACEHOLDER = "Add series name";

function seriesDisplayName(item: Series, placeholder: string): string {
  return item.name.trim() || placeholder;
}

type SeriesTabBarProps = {
  allSeries: Series[];
  activeSeries: Series | null;
  activeSeriesId: string | null;
  onCreateSeries: () => void;
  onSetActiveSeries: (seriesId: string) => void;
  onDeleteSeries: (seriesId: string) => void;
  onSeriesNameChange: (seriesId: string, name: string) => void;
  className?: string;
};

export function SeriesTabBar({
  allSeries,
  activeSeries,
  activeSeriesId,
  onCreateSeries,
  onSetActiveSeries,
  onDeleteSeries,
  onSeriesNameChange,
  className,
}: SeriesTabBarProps) {
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [deleteSeriesId, setDeleteSeriesId] = useState<string | null>(null);
  const [exportIconState, setExportIconState] = useState<"a" | "b">("a");
  const exportResetTimeoutRef = useRef<number | null>(null);
  const hasInitialSeriesNameEditRef = useRef(false);
  const pendingSeriesNameFocusRef = useRef(false);
  const activeSeriesTabRef = useRef<HTMLElement | null>(null);
  const addSeriesButtonRef = useRef<HTMLButtonElement>(null);
  const tabTrackRef = useRef<HTMLDivElement>(null);
  const tabsMeasureRef = useRef<HTMLDivElement>(null);
  const [tabsOverflow, setTabsOverflow] = useState(false);
  const [addSeriesWidth, setAddSeriesWidth] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const hasAdditionalEvents = (activeSeries?.timepoints.length ?? 0) > 1;
  const pendingDeleteSeries = deleteSeriesId
    ? (allSeries.find((item) => item.id === deleteSeriesId) ?? null)
    : null;

  useEffect(() => {
    return () => {
      if (exportResetTimeoutRef.current) {
        window.clearTimeout(exportResetTimeoutRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!activeSeries) {
      return;
    }

    if (pendingSeriesNameFocusRef.current) {
      pendingSeriesNameFocusRef.current = false;
      setEditingSeriesId(activeSeries.id);
      return;
    }

    if (hasInitialSeriesNameEditRef.current) {
      return;
    }

    hasInitialSeriesNameEditRef.current = true;
    setEditingSeriesId(activeSeries.id);
  }, [activeSeries?.id]);

  useEffect(() => {
    const tab = activeSeriesTabRef.current;
    const track = tabTrackRef.current;
    if (!tab || !track) {
      return;
    }

    const tabRect = tab.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    const isFullyVisible = tabRect.left >= trackRect.left && tabRect.right <= trackRect.right;
    if (!isFullyVisible) {
      tab.scrollIntoView({
        behavior: shouldReduceMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeSeriesId, editingSeriesId, shouldReduceMotion]);

  useLayoutEffect(() => {
    const track = tabTrackRef.current;
    const tabs = tabsMeasureRef.current;
    const addSeriesButton = addSeriesButtonRef.current;
    if (!track || !tabs || !addSeriesButton) {
      return;
    }

    const updateOverflow = () => {
      const gap = 12;
      setAddSeriesWidth(addSeriesButton.offsetWidth);
      const neededWidth = tabs.scrollWidth + addSeriesButton.offsetWidth + gap;
      setTabsOverflow(neededWidth > track.clientWidth);
    };

    updateOverflow();
    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(track);
    resizeObserver.observe(tabs);
    resizeObserver.observe(addSeriesButton);
    return () => resizeObserver.disconnect();
  }, [allSeries, activeSeriesId, editingSeriesId]);

  const handleCreateSeries = () => {
    pendingSeriesNameFocusRef.current = true;
    onCreateSeries();
  };

  const finalizeDeleteSeries = (seriesId: string) => {
    onDeleteSeries(seriesId);
    if (editingSeriesId === seriesId) {
      setEditingSeriesId(null);
    }
  };

  const handleDeleteSeriesRequest = (seriesId: string) => {
    const target = allSeries.find((item) => item.id === seriesId);
    if (!target) {
      return;
    }
    if (target.timepoints.length > 1) {
      setDeleteSeriesId(seriesId);
      return;
    }
    finalizeDeleteSeries(seriesId);
  };

  const handleDeleteSeriesConfirm = () => {
    if (!deleteSeriesId) {
      return;
    }
    finalizeDeleteSeries(deleteSeriesId);
    setDeleteSeriesId(null);
  };

  const handleExport = () => {
    if (!activeSeries) {
      return;
    }

    const ics = buildIcs([activeSeries], DEFAULT_EXPORT_DURATION_MINUTES);
    triggerIcsDownload(ics);

    if (exportResetTimeoutRef.current) {
      window.clearTimeout(exportResetTimeoutRef.current);
    }

    setExportIconState("b");
    exportResetTimeoutRef.current = window.setTimeout(() => {
      setExportIconState("a");
      exportResetTimeoutRef.current = null;
    }, EXPORT_SUCCESS_MS);
  };

  const seriesTabs = allSeries.map((item) => (
    <SeriesTab
      key={item.id}
      tabRef={
        item.id === activeSeriesId || editingSeriesId === item.id ? activeSeriesTabRef : undefined
      }
      item={item}
      placeholder={SERIES_NAME_PLACEHOLDER}
      isActive={item.id === activeSeriesId}
      isEditing={editingSeriesId === item.id}
      showDelete={allSeries.length > 1}
      onActivate={() => {
        onSetActiveSeries(item.id);
        setEditingSeriesId(item.id);
      }}
      onNameChange={(name) => onSeriesNameChange(item.id, name)}
      onFinishEdit={() => setEditingSeriesId(null)}
      onDelete={() => handleDeleteSeriesRequest(item.id)}
    />
  ));

  const renderAddSeriesButton = () => (
    <button
      ref={addSeriesButtonRef}
      type="button"
      onClick={handleCreateSeries}
      aria-label="Add series"
      className="relative inline-flex shrink-0 items-center pb-2.5 pt-1"
    >
      <span className="inline-flex items-center rounded-[12px] px-1.5 py-0.5 text-[12px] font-medium tracking-[0.16px] text-[#6b6b74] transition-colors duration-spring-moderate hover:bg-[#f0f0eb] hover:text-[#161616]">
        + Series
      </span>
    </button>
  );

  return (
    <>
      <div className={cn("relative z-20 shrink-0 bg-[#f9f9f7] px-3 pb-3", className)}>
        <div className="flex items-end gap-2">
          <div
            ref={tabTrackRef}
            className="relative flex min-w-0 flex-1 items-end border-b border-[#e3e3e3]"
          >
            <ScrollArea
              orientation="horizontal"
              cueSize="tight"
              scrollFade={tabsOverflow}
              className={cn(
                "min-w-0 flex-1 [--surface-1:#f9f9f7]",
                tabsOverflow
                  ? "[&_[data-slot=scroll-area-viewport]]:pr-[var(--add-series-reserve)]"
                  : "[&_[data-slot=scroll-area-viewport]]:overflow-x-visible",
              )}
              style={
                tabsOverflow
                  ? ({ ["--add-series-reserve" as string]: `${addSeriesWidth + 8}px` } as CSSProperties)
                  : undefined
              }
              viewportClassName="[&>div]:!block"
            >
              <div className="flex w-max min-w-0 items-end gap-3">
                <div ref={tabsMeasureRef} className="flex items-end gap-3">
                  {seriesTabs}
                </div>
                {!tabsOverflow ? renderAddSeriesButton() : null}
              </div>
            </ScrollArea>
            {tabsOverflow ? (
              <div className="absolute right-0 bottom-0 z-20 bg-[#f9f9f7] pl-2">{renderAddSeriesButton()}</div>
            ) : null}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                disabled={!activeSeries || activeSeries.timepoints.length === 0}
                onClick={handleExport}
                aria-label={exportIconState === "b" ? "Exported to calendar" : "Export to calendar"}
                className={cn(
                  "h-8 w-8 shrink-0 rounded-[12px] border-0 shadow-none",
                  hasAdditionalEvents
                    ? "bg-[#161616] text-white hover:bg-[#2a2a2a] hover:text-white"
                    : "bg-[#f0f0eb] text-[#161616] hover:bg-[#e8e8e4] hover:text-[#161616]",
                )}
              >
                <span
                  className="t-icon-swap relative inline-grid size-4 shrink-0"
                  data-state={exportIconState}
                  aria-hidden
                >
                  <span className="t-icon col-start-1 row-start-1 flex items-center justify-center" data-icon="a">
                    <Download
                      className={cn("h-4 w-4", hasAdditionalEvents ? "text-white" : "text-[#161616]")}
                    />
                  </span>
                  <span className="t-icon col-start-1 row-start-1 flex items-center justify-center" data-icon="b">
                    <Check
                      className={cn("h-4 w-4", hasAdditionalEvents ? "text-white" : "text-[#161616]")}
                      strokeWidth={2.5}
                    />
                  </span>
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className={TOOLTIP_CONTENT_CLASS}>Export to calendar</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Dialog open={deleteSeriesId !== null} onOpenChange={(open) => !open && setDeleteSeriesId(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              Delete {pendingDeleteSeries ? seriesDisplayName(pendingDeleteSeries, SERIES_NAME_PLACEHOLDER) : "series"}?
            </DialogTitle>
            <DialogDescription>
              This will remove all events in this series. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteSeriesId(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteSeriesConfirm}>
              Delete series
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
