"use client";

import { useLayoutEffect, useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type AnchoredListProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  children: React.ReactNode;
  className?: string;
  width?: number;
  xOffset?: number;
  initialScrollToValue?: string;
  /** Receives the portaled panel root for click-outside / focus guards. */
  panelRef?: Ref<HTMLDivElement>;
};

function getAnchorPosition(anchorEl: HTMLElement, xOffset = 0) {
  const rect = anchorEl.getBoundingClientRect();
  return { top: rect.bottom + 4, left: rect.left + xOffset };
}

function isEventFromList(event: Event, listEl: HTMLDivElement | null) {
  return event.target instanceof Node && listEl?.contains(event.target);
}

export function AnchoredList({
  open,
  anchorEl,
  children,
  className,
  width = 208,
  xOffset = 0,
  initialScrollToValue,
  panelRef,
}: AnchoredListProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolledRef = useRef(false);

  useLayoutEffect(() => {
    if (!open || !anchorEl) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const next = getAnchorPosition(anchorEl, xOffset);
      setPosition((prev) =>
        prev && prev.top === next.top && prev.left === next.left ? prev : next,
      );
    };

    updatePosition();

    const handleScroll = (event: Event) => {
      if (isEventFromList(event, listRef.current)) {
        return;
      }
      updatePosition();
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, anchorEl, xOffset]);

  useLayoutEffect(() => {
    if (!open) {
      hasInitialScrolledRef.current = false;
      return;
    }

    if (!position || !initialScrollToValue || hasInitialScrolledRef.current) {
      return;
    }

    const list = listRef.current;
    if (!list) {
      return;
    }

    const target = list.querySelector<HTMLElement>(`[data-time-value="${initialScrollToValue}"]`);
    if (target) {
      list.scrollTop = target.offsetTop;
    }

    hasInitialScrolledRef.current = true;
  }, [open, position, initialScrollToValue]);

  if (!open || !anchorEl || !position || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={panelRef}
      className="z-50 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ position: "fixed", top: position.top, left: position.left, width }}
    >
      <div
        ref={listRef}
        className={cn("max-h-52 overflow-y-auto overscroll-contain", className)}
        onWheel={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
