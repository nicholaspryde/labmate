"use client";

import type { ReactNode } from "react";
import { AccountMenu } from "@/components/auth/account-menu";
import { HelpMenu } from "@/components/help/help-menu";
import { SeriesSidebar } from "@/components/experiment/series-sidebar";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
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
  return (
    <aside
      className={cn(
        "relative flex h-full w-full flex-col border-r border-border bg-background",
        className,
      )}
    >
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

      <div className="mt-auto shrink-0 border-t border-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <AccountMenu />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SettingsDialog />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <HelpMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </aside>
  );
}
