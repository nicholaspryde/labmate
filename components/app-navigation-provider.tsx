"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AppSection = "active" | "history";

const STORAGE_KEY = "labmate:app-section";

type AppNavigationContextValue = {
  section: AppSection;
  setSection: (section: AppSection) => void;
};

const AppNavigationContext = createContext<AppNavigationContextValue | null>(null);

export function AppNavigationProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<AppSection>("active");

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "active" || stored === "history") {
      setSection(stored);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, section);
  }, [section]);

  return (
    <AppNavigationContext.Provider value={{ section, setSection }}>
      {children}
    </AppNavigationContext.Provider>
  );
}

export function useAppNavigation() {
  const context = useContext(AppNavigationContext);
  if (!context) {
    throw new Error("useAppNavigation must be used within AppNavigationProvider.");
  }
  return context;
}
