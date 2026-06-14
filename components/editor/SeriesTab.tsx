"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import type { Series } from "@/lib/types";
import { DISABLE_AUTOFILL_INPUT_PROPS } from "@/lib/autofill";
import { cn } from "@/lib/utils";

type SeriesTabProps = {
  item: Series;
  placeholder?: string;
  isActive: boolean;
  isEditing: boolean;
  showDelete?: boolean;
  tabRef?: RefObject<HTMLElement | null>;
  onActivate: () => void;
  onDelete: () => void;
  onNameChange: (name: string) => void;
  onFinishEdit: () => void;
};

export function SeriesTab({
  item,
  placeholder = "Add series name",
  isActive,
  isEditing,
  showDelete = false,
  tabRef,
  onActivate,
  onDelete,
  onNameChange,
  onFinishEdit,
}: SeriesTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasName = item.name.trim().length > 0;
  const displayText = hasName ? item.name : placeholder;
  const sizerText = isEditing ? item.name || placeholder : displayText;

  useLayoutEffect(() => {
    if (!isEditing || !inputRef.current) {
      return;
    }
    inputRef.current.focus();
    inputRef.current.select();
  }, [isEditing]);

  const tabClassName = cn(
    "relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-1.5 pb-2.5 pt-1 text-[16px] font-medium transition-colors duration-spring-moderate",
    isActive ? "text-[#161616]" : "text-[#6b6b74] hover:text-[#161616]",
  );

  const colorDot = (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: item.color }}
      aria-hidden
    />
  );

  const underline = isActive ? (
    <span
      className="absolute inset-x-0 bottom-0 h-0.5 rounded-full transition-opacity duration-spring-moderate"
      style={{ backgroundColor: item.color }}
      aria-hidden
    />
  ) : null;

  const labelContent = (
    <span
      className={cn(
        "absolute inset-0 flex items-center transition-[opacity,color] duration-spring-moderate",
        isEditing ? "pointer-events-none opacity-0" : "opacity-100",
        !hasName && "text-[#a8adb5] group-hover:text-[#8f959e]",
      )}
    >
      {displayText}
    </span>
  );

  const editContent = (
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
      placeholder={placeholder}
      aria-label={placeholder}
      tabIndex={isEditing ? 0 : -1}
      className={cn(
        "absolute inset-0 w-full min-w-0 border-0 bg-transparent p-0 text-[16px] font-medium text-[#161616] outline-none transition-opacity duration-spring-moderate placeholder:text-[#a8adb5]",
        isEditing ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    />
  );

  const deleteButton = (
    <button
      type="button"
      aria-label="Delete series"
      onClick={(event) => {
        event.stopPropagation();
        onDelete();
      }}
      className="pointer-events-none absolute top-[calc(0.25rem+(100%-0.875rem)/2)] right-0.5 z-20 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded bg-[#f9f9f7] text-[#a8adb5] opacity-0 transition-opacity duration-spring-moderate hover:bg-[#f0f0eb] hover:text-[#6b6b74] group-hover:pointer-events-auto group-hover:opacity-100"
    >
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );

  return (
    <div ref={tabRef as RefObject<HTMLDivElement | null>} className="group relative inline-flex shrink-0 items-center">
      <button
        type="button"
        onClick={onActivate}
        className={tabClassName}
        aria-current={isActive ? "true" : undefined}
        aria-label={hasName ? item.name : placeholder}
      >
        {colorDot}
        <span
          className={cn(
            "relative inline-block min-w-[4rem] transition-[width] duration-spring-moderate ease-out",
          )}
        >
          <span className="invisible block whitespace-pre px-0 text-[16px]" aria-hidden>
            {sizerText}
          </span>
          {labelContent}
          {editContent}
        </span>
        {showDelete ? <span className="inline-block w-5 shrink-0" aria-hidden /> : null}
        {underline}
      </button>
      {showDelete ? deleteButton : null}
    </div>
  );
}
