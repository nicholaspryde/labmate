"use client";

import { createContext, useContext } from "react";

export const ExperimentPanelSlotContext = createContext<HTMLDivElement | null>(null);

export function useExperimentPanelSlot(): HTMLDivElement | null {
  return useContext(ExperimentPanelSlotContext);
}
