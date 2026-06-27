import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppState } from "@/lib/types";
import { validateAppState } from "@/lib/workspace/validate";

type WorkspaceRow = {
  user_id: string;
  app_state: unknown;
  updated_at: string;
};

async function assertAuthenticatedClient(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Workspace sync requires an active sign-in session.");
  }

  if (user.id !== userId) {
    throw new Error("Signed-in user does not match the workspace owner.");
  }
}

export async function loadRemoteWorkspace(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppState | null> {
  await assertAuthenticatedClient(supabase, userId);

  const { data, error } = await supabase
    .from("user_workspaces")
    .select("app_state")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return validateAppState((data as Pick<WorkspaceRow, "app_state">).app_state);
}

export async function saveRemoteWorkspace(
  supabase: SupabaseClient,
  userId: string,
  state: AppState,
): Promise<void> {
  await assertAuthenticatedClient(supabase, userId);

  const { error } = await supabase.from("user_workspaces").upsert(
    {
      user_id: userId,
      app_state: state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
}

export async function migrateLocalWorkspaceToRemote(
  supabase: SupabaseClient,
  userId: string,
  localState: AppState,
): Promise<AppState> {
  const remote = await loadRemoteWorkspace(supabase, userId);
  if (remote) {
    return remote;
  }

  await saveRemoteWorkspace(supabase, userId, localState);
  return localState;
}
