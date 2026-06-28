"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import type { Series } from "@/lib/types";
import { DISABLE_AUTOFILL_INPUT_PROPS } from "@/lib/autofill";
import { cn } from "@/lib/utils";

type SeriesListItemProps = {
  item: Series;
  placeholder?: string;
  isActive: boolean;
  isEditing: boolean;
  showDelete?: boolean;
  itemRef?: RefObject<HTMLButtonElement | null>;
  onActivate: () => void;
  onDelete: () => void;
  onNameChange: (name: string) => void;
  onFinishEdit: () => void;
};

export function SeriesListItem({
  item,
  placeholder = "Add series name",
  isActive,
  isEditing,
  showDelete = false,
  itemRef,
  onActivate,
  onDelete,
  onNameChange,
  onFinishEdit,
}: SeriesListItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasName = item.name.trim().length > 0;
  const displayText = hasName ? item.name : placeholder;

  useLayoutEffect(() => {
    if (!isEditing || !inputRef.current) {
      return;
    }
    inputRef.current.focus();
    inputRef.current.select();
  }, [isEditing]);

  return (
    <div className="group relative">
      <button
        ref={itemRef}
        type="button"
        onClick={onActivate}
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
          isActive
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
        )}
      >
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: item.color }}
          aria-hidden
        />
        {isEditing ? (
          <input
            ref={inputRef}
            value={item.name}
            {...DISABLE_AUTOFILL_INPUT_PROPS}
            onChange={(event) => onNameChange(event.target.value)}
            onBlur={onFinishEdit}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape") {
                event.preventDefault();
                onFinishEdit();
              }
            }}
            onClick={(event) => event.stopPropagation()}
            placeholder={placeholder}
            aria-label={placeholder}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        ) : (
          <span className={cn("min-w-0 flex-1 truncate", !hasName && "text-muted-foreground/70")}>
            {displayText}
          </span>
        )}
      </button>
      {showDelete ? (
        <button
          type="button"
          aria-label="Delete series"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="absolute top-1/2 right-1 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
