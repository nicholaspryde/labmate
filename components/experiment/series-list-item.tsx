"use client";

import { Archive, ArchiveRestore, BookmarkPlus, Download, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Series } from "@/lib/types";
import { cn } from "@/lib/utils";

const FADE_WIDTH = 32; // px — width of the right-side fade zone

type SeriesListItemProps = {
  item: Series;
  placeholder?: string;
  isActive: boolean;
  isHistory?: boolean;
  canDelete?: boolean;
  canArchive?: boolean;
  canUnarchive?: boolean;
  itemRef?: RefObject<HTMLButtonElement | null>;
  onActivate: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onSaveAsPreset: () => void;
  onDownload: () => void;
  onRename: () => void;
};

export function SeriesListItem({
  item,
  placeholder = "Untitled series",
  isActive,
  isHistory = false,
  canDelete = false,
  canArchive = false,
  canUnarchive = false,
  itemRef,
  onActivate,
  onDelete,
  onArchive,
  onUnarchive,
  onSaveAsPreset,
  onDownload,
  onRename,
}: SeriesListItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasName = item.name.trim().length > 0;
  const displayText = hasName ? item.name : placeholder;

  const textContainerRef = useRef<HTMLDivElement>(null);
  const textSpanRef = useRef<HTMLSpanElement>(null);
  const [isMarqueeActive, setIsMarqueeActive] = useState(false);
  const [marqueeScrollPx, setMarqueeScrollPx] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);

  useLayoutEffect(() => {
    if (!textContainerRef.current || !textSpanRef.current) return;
    setHasOverflow(textSpanRef.current.scrollWidth > textContainerRef.current.clientWidth);
  }, [displayText]);

  const handleRowMouseEnter = () => {
    if (!textContainerRef.current || !textSpanRef.current) return;
    const overflow = textSpanRef.current.scrollWidth - textContainerRef.current.clientWidth;
    if (overflow > 0) {
      setMarqueeScrollPx(overflow + FADE_WIDTH);
      setIsMarqueeActive(true);
    }
  };

  const handleRowMouseLeave = () => {
    setIsMarqueeActive(false);
  };

  return (
    <div
      className="group relative min-w-0 w-full"
      onMouseEnter={handleRowMouseEnter}
      onMouseLeave={handleRowMouseLeave}
    >
      <button
        ref={itemRef}
        type="button"
        onClick={onActivate}
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "flex w-full min-w-0 items-center gap-2 rounded-md py-1.5 pr-2 pl-2 text-left text-sm transition-colors",
          isActive
            ? "bg-[#f0f0eb] text-foreground"
            : isHistory
              ? "text-muted-foreground/70 hover:bg-secondary/60 hover:text-foreground"
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
        )}
      >
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
          style={{
            backgroundColor: item.color,
            ...(isHistory ? { filter: "grayscale(0.7)", opacity: 0.6 } : null),
          }}
          aria-hidden
        />
        <div
          ref={textContainerRef}
          className="relative min-w-0 flex-1 overflow-hidden"
          style={hasOverflow ? { maskImage: `linear-gradient(to right, black calc(100% - ${FADE_WIDTH}px), transparent 100%)` } : undefined}
        >
          <span
            ref={textSpanRef}
            className={cn("inline-block whitespace-nowrap", !hasName && "text-muted-foreground/70")}
            style={isMarqueeActive ? {
              animationName: "series-marquee",
              animationDuration: "4s",
              animationTimingFunction: "ease-in-out",
              animationFillMode: "forwards",
              "--marquee-px": `${marqueeScrollPx}px`,
            } as React.CSSProperties : undefined}
          >
            {displayText}
          </span>
        </div>
      </button>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Series options"
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "absolute top-1/2 right-1 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-[opacity,background-color] focus-visible:opacity-100 group-hover:opacity-100 group-hover:bg-[#e8e8e4] group-hover:text-foreground hover:bg-[#d8d8d2] active:bg-[#ccccc6]",
              menuOpen ? "opacity-100 bg-[#e8e8e4] text-foreground" : "opacity-0",
            )}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem className="gap-2" onSelect={onRename}>
            <Pencil className="h-4 w-4" aria-hidden />
            Rename
          </DropdownMenuItem>
          {canArchive ? (
            <DropdownMenuItem className="gap-2" onSelect={onArchive}>
              <Archive className="h-4 w-4" aria-hidden />
              Archive
            </DropdownMenuItem>
          ) : null}
          {canUnarchive ? (
            <DropdownMenuItem className="gap-2" onSelect={onUnarchive}>
              <ArchiveRestore className="h-4 w-4" aria-hidden />
              Move to Active
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem className="gap-2" onSelect={onDownload}>
            <Download className="h-4 w-4" aria-hidden />
            Download .ics
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onSelect={onSaveAsPreset}>
            <BookmarkPlus className="h-4 w-4" aria-hidden />
            Save as preset
          </DropdownMenuItem>
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                onSelect={onDelete}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
