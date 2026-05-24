"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type AnchoredListProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  children: React.ReactNode;
  className?: string;
  width?: number;
  initialScrollToValue?: string;
};

function getAnchorPosition(anchorEl: HTMLElement) {
  const rect = anchorEl.getBoundingClientRect();
  return { top: rect.bottom + 4, left: rect.left };
}

export function AnchoredList({
  open,
  anchorEl,
  children,
  className,
  width = 208,
  initialScrollToValue,
}: AnchoredListProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !anchorEl) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      setPosition(getAnchorPosition(anchorEl));
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, anchorEl]);

  useLayoutEffect(() => {
    if (!open || !position || !initialScrollToValue) {
      return;
    }

    const scrollToInitialValue = () => {
      const list = listRef.current;
      if (!list) {
        return;
      }
      const target = list.querySelector<HTMLElement>(`[data-time-value="${initialScrollToValue}"]`);
      target?.scrollIntoView({ block: "start" });
    };

    scrollToInitialValue();
    const frame = requestAnimationFrame(scrollToInitialValue);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [open, position, initialScrollToValue]);

  if (!open || !anchorEl || !position || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "z-50 rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        className,
      )}
      style={{ position: "fixed", top: position.top, left: position.left, width }}
    >
      <div ref={listRef} className={cn("max-h-52 overflow-auto", className)}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
