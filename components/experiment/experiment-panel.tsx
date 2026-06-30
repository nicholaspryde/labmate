"use client";

import type { ReactNode } from "react";
import { SeriesSidebar } from "@/components/experiment/series-sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import type { OffsetMode, Series } from "@/lib/types";
import { cn } from "@/lib/utils";

type ExperimentPanelProps = {
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
  className?: string;
};

export function ExperimentPanel({
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
  className,
}: ExperimentPanelProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <aside
      className={cn(
        "relative flex h-full w-full flex-col border-r border-border bg-background",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Toggle Sidebar"
        onClick={toggleSidebar}
        className="group absolute inset-y-0 left-0 z-10 hidden w-3 cursor-w-resize md:block"
      >
        <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 transition-colors group-hover:bg-border" />
      </button>
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">Event series</h2>
      </div>

      <SeriesSidebar
        allSeries={allSeries}
        activeSeries={activeSeries}
        activeSeriesId={activeSeriesId}
        offsetMode={offsetMode}
        onCreateSeries={onCreateSeries}
        onSetActiveSeries={onSetActiveSeries}
        onRequestSetActiveSeries={onRequestSetActiveSeries}
        onDeleteSeries={onDeleteSeries}
        onArchiveSeries={onArchiveSeries}
        onUnarchiveSeries={onUnarchiveSeries}
        onSeriesNameChange={onSeriesNameChange}
        onRenameSeries={onRenameSeries}
        syncControls={syncControls}
      />
    </aside>
  );
}
