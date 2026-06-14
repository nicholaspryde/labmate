"use client";

import { Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  buildWeekendAvoidanceSuggestion,
  shouldOfferWeekendAvoidance,
} from "@/lib/timepointMath";
import type { Series } from "@/lib/types";
import { spring } from "@/lib/springs";

type AvoidWeekendsButtonProps = {
  series: Series;
  onApply: (deltaDays: number) => void;
  onMessage?: (message: string) => void;
};

export function formatOptimizeToast(
  deltaDays: number,
  remainingWeekendCount: number,
  isFullyClear: boolean,
): string {
  const magnitude = Math.abs(deltaDays);
  const unit = magnitude === 1 ? "day" : "days";
  const direction = deltaDays > 0 ? "forward" : "back";
  const base = `Shifted events ${direction} ${magnitude} ${unit}`;
  if (isFullyClear) {
    return base;
  }
  const remainUnit = remainingWeekendCount === 1 ? "day" : "days";
  const verb = remainingWeekendCount === 1 ? "remains" : "remain";
  return `${base} · ${remainingWeekendCount} weekend ${remainUnit} ${verb}`;
}

export function isOptimizeSuccessMessage(message: string): boolean {
  return message.startsWith("Shifted events");
}

export function AvoidWeekendsButton({ series, onApply, onMessage }: AvoidWeekendsButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const canOptimize = shouldOfferWeekendAvoidance(series);
  const suggestion = useMemo(
    () => (canOptimize ? buildWeekendAvoidanceSuggestion(series) : null),
    [canOptimize, series],
  );

  const handleOptimize = () => {
    if (!suggestion) {
      onMessage?.("Already uses the fewest weekend days possible");
      return;
    }

    onApply(suggestion.deltaDays);
    onMessage?.(
      formatOptimizeToast(suggestion.deltaDays, suggestion.remainingWeekendCount, suggestion.isFullyClear),
    );
  };

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {canOptimize ? (
        <motion.div
          key="optimize-button"
          layout
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, x: 6 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.96, x: 6, transition: spring.moderate.exit }
          }
          transition={spring.moderate}
          className="ml-auto"
        >
          <Button
            type="button"
            variant="toolbar"
            aria-label="Optimize"
            title="Shift dates to minimize weekends"
            className="gap-1.5"
            onClick={handleOptimize}
          >
            <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
            Optimize
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
