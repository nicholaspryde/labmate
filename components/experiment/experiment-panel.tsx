"use client";

import type { ReactNode } from "react";
import { ActiveExperimentsList } from "@/components/experiment/active-experiments-list";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAppNavigation, type AppSection } from "@/components/app-navigation-provider";
import type { Series } from "@/lib/types";
import { cn } from "@/lib/utils";

type ExperimentPanelProps = {
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

const TABS: { section: AppSection; label: string }[] = [
  { section: "active", label: "Active" },
  { section: "history", label: "History" },
];

export function ExperimentPanel({
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
}: ExperimentPanelProps) {
  const { section, setSection } = useAppNavigation();

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col border-r border-border bg-background",
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <SidebarTrigger className="hidden md:inline-flex" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">Event series</h2>
      </div>

      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-2">
        {TABS.map(({ section: tab, label }) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSection(tab)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              section === tab
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {section === "active" ? (
          <ActiveExperimentsList
            allSeries={allSeries}
            activeSeries={activeSeries}
            activeSeriesId={activeSeriesId}
            onCreateSeries={onCreateSeries}
            onSetActiveSeries={onSetActiveSeries}
            onRequestSetActiveSeries={onRequestSetActiveSeries}
            onDeleteSeries={onDeleteSeries}
            onSeriesNameChange={onSeriesNameChange}
            syncControls={syncControls}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-center text-sm text-muted-foreground">Nothing here yet.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
