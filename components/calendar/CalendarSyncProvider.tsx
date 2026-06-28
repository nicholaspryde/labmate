"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useCalendarSync, type CalendarSyncContextValue } from "@/hooks/use-calendar-sync";
import type { Series } from "@/lib/types";

const CalendarSyncContext = createContext<CalendarSyncContextValue | null>(null);

type CalendarSyncProviderProps = {
  userId: string | null;
  authLoading: boolean;
  series: Series[];
  children: ReactNode;
};

export function CalendarSyncProvider({
  userId,
  authLoading,
  series,
  children,
}: CalendarSyncProviderProps) {
  const value = useCalendarSync({ userId, authLoading, series });
  return <CalendarSyncContext.Provider value={value}>{children}</CalendarSyncContext.Provider>;
}

export function useCalendarSyncContext() {
  const context = useContext(CalendarSyncContext);
  if (!context) {
    throw new Error("useCalendarSyncContext must be used within CalendarSyncProvider.");
  }
  return context;
}

export function useOptionalCalendarSyncContext() {
  return useContext(CalendarSyncContext);
}
