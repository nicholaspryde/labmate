"use client";

import { useCallback, useLayoutEffect, useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type AnchoredListPlacement = "below" | "right";

type AnchoredListProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  children: React.ReactNode;
  className?: string;
  width?: number;
  xOffset?: number;
  /** Where to place the panel relative to the anchor. Defaults to `"below"`. */
  placement?: AnchoredListPlacement;
  initialScrollToValue?: string;
  /** Receives the portaled panel root for click-outside / focus guards. */
  panelRef?: Ref<HTMLDivElement>;
};

const VIEWPORT_PADDING = 8;
const ANCHOR_GAP = 4;
/** Matches `max-h-52` — used before the panel is measured. */
const ESTIMATED_PANEL_HEIGHT = 208;

function isEventFromList(event: Event, listEl: HTMLDivElement | null) {
  return event.target instanceof Node && listEl?.contains(event.target);
}

function computeAnchoredPosition({
  anchorRect,
  panelWidth,
  panelHeight,
  xOffset,
  placement,
}: {
  anchorRect: DOMRect;
  panelWidth: number;
  panelHeight: number;
  xOffset: number;
  placement: AnchoredListPlacement;
}): { top: number; left: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (placement === "right") {
    let left = anchorRect.right + ANCHOR_GAP + xOffset;
    if (left + panelWidth > viewportWidth - VIEWPORT_PADDING) {
      const flippedLeft = anchorRect.left - panelWidth - ANCHOR_GAP - xOffset;
      if (flippedLeft >= VIEWPORT_PADDING) {
        left = flippedLeft;
      }
    }

    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, viewportWidth - panelWidth - VIEWPORT_PADDING),
    );

    let top = anchorRect.top;
    top = Math.max(
      VIEWPORT_PADDING,
      Math.min(top, viewportHeight - panelHeight - VIEWPORT_PADDING),
    );

    return { top, left };
  }

  const spaceBelow = viewportHeight - anchorRect.bottom - ANCHOR_GAP - VIEWPORT_PADDING;
  const spaceAbove = anchorRect.top - ANCHOR_GAP - VIEWPORT_PADDING;
  const placeAbove = panelHeight > spaceBelow && spaceAbove > spaceBelow;

  let top = placeAbove
    ? anchorRect.top - panelHeight - ANCHOR_GAP
    : anchorRect.bottom + ANCHOR_GAP;
  top = Math.max(
    VIEWPORT_PADDING,
    Math.min(top, viewportHeight - panelHeight - VIEWPORT_PADDING),
  );

  let left = anchorRect.left + xOffset;

  if (xOffset > 0 && left + panelWidth > viewportWidth - VIEWPORT_PADDING) {
    const flippedLeft = anchorRect.left - panelWidth - ANCHOR_GAP;
    if (flippedLeft >= VIEWPORT_PADDING) {
      left = flippedLeft;
    }
  }

  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, viewportWidth - panelWidth - VIEWPORT_PADDING),
  );

  return { top, left };
}

function positionsEqual(
  a: { top: number; left: number } | null,
  b: { top: number; left: number },
): boolean {
  return a !== null && a.top === b.top && a.left === b.left;
}

export function AnchoredList({
  open,
  anchorEl,
  children,
  className,
  width = 208,
  xOffset = 0,
  placement = "below",
  initialScrollToValue,
  panelRef,
}: AnchoredListProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelOuterRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolledRef = useRef(false);

  const setPanelRef = useCallback(
    (node: HTMLDivElement | null) => {
      panelOuterRef.current = node;
      if (typeof panelRef === "function") {
        panelRef(node);
      } else if (panelRef) {
        panelRef.current = node;
      }
    },
    [panelRef],
  );

  useLayoutEffect(() => {
    if (!open || !anchorEl) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchorRect = anchorEl.getBoundingClientRect();
      const panelHeight = panelOuterRef.current?.offsetHeight ?? ESTIMATED_PANEL_HEIGHT;
      const next = computeAnchoredPosition({
        anchorRect,
        panelWidth: width,
        panelHeight,
        xOffset,
        placement,
      });
      setPosition((prev) => (positionsEqual(prev, next) ? prev : next));
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

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(updatePosition) : null;
    if (resizeObserver && panelOuterRef.current) {
      resizeObserver.observe(panelOuterRef.current);
    }

    const rafId = requestAnimationFrame(() => {
      updatePosition();
      if (resizeObserver && panelOuterRef.current) {
        resizeObserver.observe(panelOuterRef.current);
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePosition);
      resizeObserver?.disconnect();
    };
  }, [open, anchorEl, xOffset, width, placement, children]);

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
      ref={setPanelRef}
      data-anchored-list
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
