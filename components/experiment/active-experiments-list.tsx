"use client";

import { Check, Download, Plus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ExportCalendarDialog } from "@/components/editor/ExportCalendarDialog";
import { SeriesListItem } from "@/components/experiment/series-list-item";
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
import { DEFAULT_EVENT_DURATION_MINUTES, exportAllSeriesAsIcs } from "@/lib/icsExport";
import type { Series } from "@/lib/types";

const TOOLTIP_CONTENT_CLASS = "border-0 bg-[#161616] text-white";
const SERIES_NAME_PLACEHOLDER = "Add series name";

function seriesDisplayName(item: Series, placeholder: string): string {
  return item.name.trim() || placeholder;
}

type ActiveExperimentsListProps = {
  allSeries: Series[];
  activeSeries: Series | null;
  activeSeriesId: string | null;
  onCreateSeries: () => void;
  onSetActiveSeries: (seriesId: string) => void;
  onRequestSetActiveSeries?: (seriesId: string) => void;
  onDeleteSeries: (seriesId: string) => void;
  onSeriesNameChange: (seriesId: string, name: string) => void;
  syncControls?: ReactNode;
};

export function ActiveExperimentsList({
  allSeries,
  activeSeries,
  activeSeriesId,
  onCreateSeries,
  onSetActiveSeries,
  onRequestSetActiveSeries,
  onDeleteSeries,
  onSeriesNameChange,
  syncControls,
}: ActiveExperimentsListProps) {
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [deleteSeriesId, setDeleteSeriesId] = useState<string | null>(null);
  const [exportIconState, setExportIconState] = useState<"a" | "b">("a");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const hasInitialSeriesNameEditRef = useRef(false);
  const pendingSeriesNameFocusRef = useRef(false);
  const activeSeriesItemRef = useRef<HTMLButtonElement>(null);

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
    const item = activeSeriesItemRef.current;
    if (!item) {
      return;
    }
    item.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeSeriesId, editingSeriesId]);

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

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-0.5 p-2">
            {allSeries.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">No series yet.</p>
            ) : null}
            {allSeries.map((item) => (
              <SeriesListItem
                key={item.id}
                item={item}
                placeholder={SERIES_NAME_PLACEHOLDER}
                isActive={item.id === activeSeriesId}
                isEditing={editingSeriesId === item.id}
                showDelete={allSeries.length > 1}
                itemRef={item.id === activeSeriesId ? activeSeriesItemRef : undefined}
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
                onNameChange={(name) => onSeriesNameChange(item.id, name)}
                onFinishEdit={() => setEditingSeriesId(null)}
                onDelete={() => handleDeleteSeriesRequest(item.id)}
              />
            ))}
          </div>
        </ScrollArea>

        <div className="shrink-0 space-y-2 border-t border-border p-2">
          <button
            type="button"
            onClick={handleCreateSeries}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            <span>Series</span>
          </button>

          {syncControls ? <div className="px-1">{syncControls}</div> : null}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!hasExportableSeries || isExporting}
                onClick={() => void handleExport()}
                aria-label="Download .ics backup"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
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
                Download .ics backup
              </Button>
            </TooltipTrigger>
            <TooltipContent className={TOOLTIP_CONTENT_CLASS}>Download .ics backup</TooltipContent>
          </Tooltip>
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
