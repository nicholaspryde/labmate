import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 1px white inset + 1px black @ 4% — replaces gray 1px borders on elevated surfaces. */
export const DIMENSIONAL_EDGE_SHADOW =
  "inset 0 0 0 1px #ffffff, 0 0 0 1px rgba(0, 0, 0, 0.04)";

export const ELEVATION_SHADOW = "0px 2px 4px 0px rgba(0, 0, 0, 0.08)";

export const SURFACE_SHADOW = `${DIMENSIONAL_EDGE_SHADOW}, ${ELEVATION_SHADOW}`;

export const SURFACE_SHADOW_HOVER = `inset 0 0 0 1px #ffffff, 0 0 0 1px rgba(0, 0, 0, 0.09), ${ELEVATION_SHADOW}`;

export const HIGHLIGHTED_SURFACE_SHADOW = `inset 0 0 0 1px #ffffff, 0 0 0 1px rgba(0, 76, 255, 0.28), 0 2px 6px rgba(16, 24, 40, 0.08), ${ELEVATION_SHADOW}`;
