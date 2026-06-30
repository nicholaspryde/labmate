"use client";

import { Check, Download } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { ExportCalendarDialog } from "@/components/editor/ExportCalendarDialog";
import { SeriesTab } from "@/components/editor/SeriesTab";
import { DEFAULT_EVENT_DURATION_MINUTES, exportAllSeriesAsIcs } from "@/lib/icsExport";
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

const TOOLTIP_CONTENT_CLASS = "border-0 bg-primary text-primary-foreground";
const SERIES_NAME_PLACEHOLDER = "Untitled series";

function seriesDisplayName(item: Series, placeholder: string): string {
  return item.name.trim() || placeholder;
}

type SeriesTabBarProps = {
  allSeries: Series[];
  activeSeries: Series | null;
  activeSeriesId: string | null;
  onCreateSeries: () => void;
  onSetActiveSeries: (seriesId: string) => void;
  onRequestSetActiveSeries?: (seriesId: string) => void;
  onDeleteSeries: (seriesId: string) => void;
  onSeriesNameChange: (seriesId: string, name: string) => void;
  syncControls?: ReactNode;
  className?: string;
};

export function SeriesTabBar({
  allSeries,
  activeSeries,
  activeSeriesId,
  onCreateSeries,
  onSetActiveSeries,
  onRequestSetActiveSeries,
  onDeleteSeries,
  onSeriesNameChange,
  syncControls,
  className,
}: SeriesTabBarProps) {
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [deleteSeriesId, setDeleteSeriesId] = useState<string | null>(null);
  const [exportIconState, setExportIconState] = useState<"a" | "b">("a");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const hasInitialSeriesNameEditRef = useRef(false);
  const pendingSeriesNameFocusRef = useRef(false);
  const activeSeriesTabRef = useRef<HTMLElement | null>(null);
  const addSeriesButtonRef = useRef<HTMLButtonElement>(null);
  const tabTrackRef = useRef<HTMLDivElement>(null);
  const tabsMeasureRef = useRef<HTMLDivElement>(null);
  const [tabsOverflow, setTabsOverflow] = useState(false);
  const [addSeriesWidth, setAddSeriesWidth] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const hasExportableSeries = allSeries.some((series) => series.timepoints.length > 0);
  const pendingDeleteSeries = deleteSeriesId
    ? (allSeries.find((item) => item.id === deleteSeriesId) ?? null)
    : null;

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

  const handleExport = async () => {
    if (!hasExportableSeries || isExporting) {
      return;
    }

    setIsExporting(true);
    try {
      const saved = await exportAllSeriesAsIcs(allSeries, DEFAULT_EVENT_DURATION_MINUTES);
      if (!saved) {
        return;
      }

      setExportIconState("b");
      setExportModalOpen(true);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportModalOpenChange = (open: boolean) => {
    setExportModalOpen(open);
    if (!open) {
      setExportIconState("a");
    }
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
        if (item.id === activeSeriesId) {
          setEditingSeriesId(item.id);
          return;
        }
        if (onRequestSetActiveSeries) {
          onRequestSetActiveSeries(item.id);
          return;
        }
        onSetActiveSeries(item.id);
        setEditingSeriesId(item.id);
      }}
      onNameChange={(name) => {
        onSeriesNameChange(item.id, name);
      }}
      onFinishEdit={() => {
        setEditingSeriesId(null);
      }}
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
      <span className="inline-flex items-center rounded-xl px-1.5 py-0.5 text-[12px] font-medium text-[#8f959e] transition-colors duration-spring-moderate hover:text-[#1e1e1a]">
        + Series
      </span>
    </button>
  );

  return (
    <>
      <div className={cn("relative z-20 shrink-0 bg-background px-3 pb-3", className)}>
        <div className="flex items-end gap-2">
          <div
            ref={tabTrackRef}
            className="relative flex min-w-0 flex-1 items-end border-b border-border"
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
              <div className="flex w-max min-w-0 items-end gap-6">
                <div ref={tabsMeasureRef} className="flex items-end gap-3">
                  {seriesTabs}
                </div>
                {!tabsOverflow ? renderAddSeriesButton() : null}
              </div>
            </ScrollArea>
            {tabsOverflow ? (
              <div className="absolute right-0 bottom-0 z-20 bg-background pl-2">{renderAddSeriesButton()}</div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-1">
            {syncControls}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={!hasExportableSeries || isExporting}
                  onClick={() => void handleExport()}
                  aria-label="Download .ics backup"
                  className="h-8 w-8 shrink-0 rounded-xl text-[#6b7280] hover:bg-accent hover:text-foreground"
                >
                  <span
                    className="t-icon-swap relative inline-grid size-4 shrink-0"
                    data-state={exportIconState}
                    aria-hidden
                  >
                    <span className="t-icon col-start-1 row-start-1 flex items-center justify-center" data-icon="a">
                      <Download className="h-4 w-4" />
                    </span>
                    <span className="t-icon col-start-1 row-start-1 flex items-center justify-center" data-icon="b">
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className={TOOLTIP_CONTENT_CLASS}>Download .ics backup</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <ExportCalendarDialog
        open={exportModalOpen}
        onOpenChange={handleExportModalOpenChange}
        seriesList={allSeries}
        seriesNamePlaceholder={SERIES_NAME_PLACEHOLDER}
      />

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
