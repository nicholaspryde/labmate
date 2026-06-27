import type { AppState } from "@/lib/types";
import { LOCAL_WORKSPACE_KEY } from "@/lib/workspace/constants";
import { validateAppState } from "@/lib/workspace/validate";

export function loadLocalWorkspace(): AppState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_WORKSPACE_KEY);
    if (!raw) {
      return null;
    }

    return validateAppState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalWorkspace(state: AppState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify(state));
}

export function clearLocalWorkspace(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LOCAL_WORKSPACE_KEY);
}
