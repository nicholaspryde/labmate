"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ExportCalendarDialog } from "@/components/editor/ExportCalendarDialog";
import { SavePresetDialog } from "@/components/presets/SavePresetDialog";
import { SeriesListItem } from "@/components/experiment/series-list-item";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DEFAULT_EVENT_DURATION_MINUTES, exportAllSeriesAsIcs } from "@/lib/icsExport";
import { partitionSeries } from "@/lib/seriesStatus";
import type { OffsetMode, Series } from "@/lib/types";

const SERIES_NAME_PLACEHOLDER = "Untitled series";

function seriesDisplayName(item: Series, placeholder: string): string {
  return item.name.trim() || placeholder;
}

function nextMidnight(from: Date): Date {
  const next = new Date(from);
  next.setHours(24, 0, 0, 0);
  return next;
}

type SeriesSidebarProps = {
  allSeries: Series[];
  activeSeries: Series | null;
  activeSeriesId: string | null;
  offsetMode: OffsetMode;
  onCreateSeries: () => void;
  onSetActiveSeries: (seriesId: string) => void;
  onRequestSetActiveSeries?: (seriesId: string) => void;
  onDeleteSeries: (seriesId: string) => void;
  onArchiveSeries: (seriesId: string) => void;
  onUnarchiveSeries: (seriesId: string) => void;
  onSeriesNameChange: (seriesId: string, name: string) => void;
  onRenameSeries: (seriesId: string) => void;
  syncControls?: ReactNode;
};

export function SeriesSidebar({
  allSeries,
  activeSeries,
  activeSeriesId,
  offsetMode,
  onCreateSeries,
  onSetActiveSeries,
  onRequestSetActiveSeries,
  onDeleteSeries,
  onArchiveSeries,
  onUnarchiveSeries,
  onSeriesNameChange,
  onRenameSeries,
  syncControls,
}: SeriesSidebarProps) {
  const [deleteSeriesId, setDeleteSeriesId] = useState<string | null>(null);
  const [savePresetSeriesId, setSavePresetSeriesId] = useState<string | null>(null);
  const [exportModalSeries, setExportModalSeries] = useState<Series | null>(null);
  const [today, setToday] = useState(() => new Date());
  const activeSeriesItemRef = useRef<HTMLButtonElement>(null);

  const { active: activeList, history: historyList } = useMemo(
    () => partitionSeries(allSeries, today),
    [allSeries, today],
  );

  const canDelete = allSeries.length > 1;
  const pendingDeleteSeries = deleteSeriesId
    ? (allSeries.find((item) => item.id === deleteSeriesId) ?? null)
    : null;
  const savePresetSeries = savePresetSeriesId
    ? (allSeries.find((item) => item.id === savePresetSeriesId) ?? null)
    : null;

  // Re-evaluate Active/History buckets when the calendar day rolls over.
  useEffect(() => {
    const timer = setTimeout(
      () => setToday(new Date()),
      Math.max(1000, nextMidnight(new Date()).getTime() - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [today]);

  useEffect(() => {
    const item = activeSeriesItemRef.current;
    if (!item) {
      return;
    }
    item.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeSeriesId]);

  const handleCreateSeries = () => {
    onCreateSeries();
  };

  const finalizeDeleteSeries = (seriesId: string) => {
    onDeleteSeries(seriesId);
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

  const handleExportSeries = async (seriesId: string) => {
    const series = allSeries.find((s) => s.id === seriesId);
    if (!series) {
      return;
    }
    const saved = await exportAllSeriesAsIcs([series], DEFAULT_EVENT_DURATION_MINUTES);
    if (saved) {
      setExportModalSeries(series);
    }
  };

  const renderItem = (item: Series, isHistory: boolean) => (
    <SeriesListItem
      key={item.id}
      item={item}
      placeholder={SERIES_NAME_PLACEHOLDER}
      isActive={item.id === activeSeriesId}
      isHistory={isHistory}
      canDelete={canDelete}
      canArchive={!isHistory}
      canUnarchive={isHistory && item.archived === true}
      itemRef={item.id === activeSeriesId ? activeSeriesItemRef : undefined}
      onActivate={() => {
        if (!item.name.trim() && item.id !== activeSeriesId) {
          onRenameSeries(item.id);
          return;
        }
        onSetActiveSeries(item.id);
      }}
      onDelete={() => handleDeleteSeriesRequest(item.id)}
      onArchive={() => onArchiveSeries(item.id)}
      onUnarchive={() => onUnarchiveSeries(item.id)}
      onSaveAsPreset={() => setSavePresetSeriesId(item.id)}
      onDownload={() => void handleExportSeries(item.id)}
      onRename={() => {
        onSetActiveSeries(item.id);
        onRenameSeries(item.id);
      }}
    />
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-2 pt-2 pb-2">
          <button
            type="button"
            onClick={handleCreateSeries}
            className="flex w-full items-center gap-2 rounded-md pl-1 pr-2 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="font-medium">New series</span>
          </button>
        </div>

        <ScrollArea className="min-h-0 flex-1" viewportClassName="overflow-x-hidden">
          <div className="p-2">
            <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground/70">
              Active
            </p>
            <div className="space-y-0.5">
              {activeList.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground/60">No active series</p>
              ) : (
                activeList.map((item) => renderItem(item, false))
              )}
            </div>

            <div className="mx-2 my-2 border-t border-border" />

            <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground/70">
              History
            </p>
            <div className="space-y-0.5">
              {historyList.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground/60">No past series</p>
              ) : (
                historyList.map((item) => renderItem(item, true))
              )}
            </div>
          </div>
        </ScrollArea>

      </div>

      <ExportCalendarDialog
        open={exportModalSeries !== null}
        onOpenChange={(open) => { if (!open) setExportModalSeries(null); }}
        seriesList={exportModalSeries ? [exportModalSeries] : []}
        seriesNamePlaceholder={SERIES_NAME_PLACEHOLDER}
      />

      {savePresetSeries ? (
        <SavePresetDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setSavePresetSeriesId(null);
            }
          }}
          series={savePresetSeries}
          offsetMode={offsetMode}
        />
      ) : null}

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
