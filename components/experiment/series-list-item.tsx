"use client";

import { Archive, ArchiveRestore, BookmarkPlus, Download, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRef, useState, type RefObject } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Series } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  placeholder = "Add series name",
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

  return (
    <div className="group relative min-w-0 w-full">
      <button
        ref={itemRef}
        type="button"
        onClick={onActivate}
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "flex w-full min-w-0 overflow-hidden items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-left text-sm transition-colors",
          isActive
            ? "bg-secondary text-foreground"
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
        <span className={cn("min-w-0 flex-1 truncate", !hasName && "text-muted-foreground/70")}>
          {displayText}
        </span>
      </button>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Series options"
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "absolute top-1/2 right-1 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100",
              menuOpen ? "opacity-100" : "opacity-0",
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
