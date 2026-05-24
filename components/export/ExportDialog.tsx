"use client";

import { useMemo, useState } from "react";
import type { Series } from "@/lib/types";
import { buildIcs, triggerIcsDownload } from "@/lib/icsExport";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ExportDialogProps = {
  series: Series[];
  triggerLabel?: string;
  triggerClassName?: string;
};

export function ExportDialog({ series, triggerLabel = "Export", triggerClassName }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(30);

  const allSelected = useMemo(
    () => (selectedIds.length === 0 ? series.map((item) => item.id) : selectedIds),
    [series, selectedIds],
  );

  const toggleSeries = (seriesId: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const base = previous.length === 0 ? series.map((item) => item.id) : previous;
      return checked ? [...base, seriesId] : base.filter((id) => id !== seriesId);
    });
  };

  const handleExport = () => {
    const selectedSeries = series.filter((item) => allSelected.includes(item.id));
    if (selectedSeries.length === 0) {
      return;
    }
    const ics = buildIcs(selectedSeries, durationMinutes);
    triggerIcsDownload(ics);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" disabled={series.length === 0} className={cn(triggerClassName)}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export as .ics</DialogTitle>
          <DialogDescription>Select series and duration before downloading.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Series</Label>
            {series.map((item) => {
              const checked = allSelected.includes(item.id);
              return (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={checked} onCheckedChange={(next) => toggleSeries(item.id, Boolean(next))} />
                  <span>{item.name}</span>
                </label>
              );
            })}
          </div>
          <div className="space-y-1">
            <Label>Event duration (minutes)</Label>
            <Input
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Math.max(1, Number(event.target.value) || 30))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleExport}>
            Download .ics
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
