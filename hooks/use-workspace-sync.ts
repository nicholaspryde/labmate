"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AppState } from "@/lib/types";
import { BOOTSTRAP_SERIES_ID, initialState, nowAnchorIso } from "@/lib/seriesReducer";
import { loadLocalWorkspace, saveLocalWorkspace } from "@/lib/workspace/local";
import { loadRemoteWorkspace, migrateLocalWorkspaceToRemote, saveRemoteWorkspace } from "@/lib/workspace/remote";

export type SaveStatus = "idle" | "offline";

type UseWorkspaceSyncOptions = {
  state: AppState;
  onHydrate: (state: AppState) => void;
  user: User | null;
  authLoading: boolean;
};

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export function useWorkspaceSync({ state, onHydrate, user, authLoading }: UseWorkspaceSyncOptions) {
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const hydratedRef = useRef(false);
  const skipNextSaveRef = useRef(true);
  const saveTimerRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (authLoading || hydratedRef.current) {
      return;
    }

    let cancelled = false;

    async function hydrate() {
      if (user && isSupabaseConfigured()) {
        const supabase = createClient();
        if (!supabase) {
          return;
        }

        try {
          const localState = loadLocalWorkspace();
          const remoteState = localState
            ? await migrateLocalWorkspaceToRemote(supabase, user.id, localState)
            : await loadRemoteWorkspace(supabase, user.id);

          if (cancelled) {
            return;
          }

          if (remoteState) {
            onHydrate(remoteState);
          } else {
            applyBootstrapAnchor(onHydrate);
          }
        } catch {
          const localState = loadLocalWorkspace();
          if (!cancelled) {
            if (localState) {
              onHydrate(localState);
            } else {
              applyBootstrapAnchor(onHydrate);
            }
            if (isBrowserOffline()) {
              setSaveStatus("offline");
            }
          }
        }
      } else {
        const localState = loadLocalWorkspace();
        if (cancelled) {
          return;
        }

        if (localState) {
          onHydrate(localState);
        } else {
          applyBootstrapAnchor(onHydrate);
        }
      }

      hydratedRef.current = true;
      skipNextSaveRef.current = true;
      setHydrated(true);
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [authLoading, onHydrate, user]);

  useEffect(() => {
    if (!hydrated || skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void persistState(state, user, setSaveStatus);
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [hydrated, state, user]);

  useEffect(() => {
    function handleOnline() {
      setSaveStatus("idle");
      if (hydratedRef.current && user && isSupabaseConfigured()) {
        void persistState(stateRef.current, user, setSaveStatus);
      }
    }

    function handleOffline() {
      if (user && isSupabaseConfigured()) {
        setSaveStatus("offline");
      }
    }

    if (user && isSupabaseConfigured() && isBrowserOffline()) {
      setSaveStatus("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user]);

  const retrySave = useCallback(() => {
    void persistState(state, user, setSaveStatus);
  }, [state, user]);

  return { hydrated, saveStatus, retrySave };
}

function applyBootstrapAnchor(onHydrate: (state: AppState) => void) {
  onHydrate({
    ...initialState,
    series: initialState.series.map((series) =>
      series.id === BOOTSTRAP_SERIES_ID
        ? { ...series, anchorAt: nowAnchorIso() }
        : series,
    ),
  });
}

async function persistState(state: AppState, user: User | null, setSaveStatus: (status: SaveStatus) => void) {
  saveLocalWorkspace(state);

  if (!user || !isSupabaseConfigured()) {
    return;
  }

  if (isBrowserOffline()) {
    setSaveStatus("offline");
    return;
  }

  const supabase = createClient();
  if (!supabase) {
    return;
  }

  try {
    await saveRemoteWorkspace(supabase, user.id, state);
    setSaveStatus("idle");
  } catch {
    if (isBrowserOffline()) {
      setSaveStatus("offline");
    }
  }
}
