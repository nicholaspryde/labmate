"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildExportSeriesSummaries,
  calculateTimeSavedMinutes,
  formatSavedTimeMessage,
} from "@/lib/exportTimeSaved";
import { useEmojiConfetti } from "@/hooks/use-emoji-confetti";
import type { Series } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONFETTI_START_DELAY_MS = 200;

type ExportCalendarDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesList: Series[];
  seriesNamePlaceholder?: string;
};

function eventCountLabel(count: number): string {
  return `${count} event${count === 1 ? "" : "s"}`;
}

export function ExportCalendarDialog({
  open,
  onOpenChange,
  seriesList,
  seriesNamePlaceholder = "Untitled series",
}: ExportCalendarDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [confettiActive, setConfettiActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const summaries = buildExportSeriesSummaries(seriesList, seriesNamePlaceholder);
  const savedMinutes = calculateTimeSavedMinutes(seriesList);
  const delightMessage = formatSavedTimeMessage(savedMinutes);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || shouldReduceMotion) {
      setConfettiActive(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setConfettiActive(true);
    }, CONFETTI_START_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
      setConfettiActive(false);
    };
  }, [open, shouldReduceMotion]);

  useEmojiConfetti(canvasRef, confettiActive);

  const confettiCanvas =
    mounted && open
      ? createPortal(
          <canvas
            ref={canvasRef}
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[51] h-full w-full"
          />,
          document.body,
        )
      : null;

  return (
    <>
      {confettiCanvas}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="z-[52] overflow-hidden sm:max-w-md">
          <div className="grid gap-4">
            <DialogHeader>
              <DialogTitle>You&apos;re all set</DialogTitle>
              <DialogDescription>
                {summaries.length === 1
                  ? "Your calendar file was saved."
                  : "Your calendar files were zipped and saved."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="rounded-md border bg-white p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {summaries.length === 1 ? "Series" : `${summaries.length} series`}
                </p>
                <ul className="space-y-2">
                  {summaries.map((summary) => (
                    <li key={summary.id} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: summary.color }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate font-medium text-[#161616]">
                        {summary.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {eventCountLabel(summary.eventCount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <p
                className={cn(
                  "rounded-md border border-[#c8e6d0] bg-[#e8f5eb] px-3 py-2.5 text-sm leading-snug text-[#1a5232]",
                )}
              >
                {delightMessage}
              </p>
            </div>

            <DialogFooter showCloseButton={false}>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
