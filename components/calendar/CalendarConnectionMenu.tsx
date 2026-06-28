"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { ConnectionPhase } from "@/hooks/use-calendar-sync";

export function CalendarConnectionMenuItems() {
  const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>("not_connected");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/calendar/status", { cache: "no-store" });
      if (!response.ok) {
        setConnectionPhase("not_connected");
        return;
      }
      const payload = (await response.json()) as { connectionPhase: ConnectionPhase };
      setConnectionPhase(payload.connectionPhase);
    } catch {
      setConnectionPhase("not_connected");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (connectionPhase === "not_connected") {
    return (
      <>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            window.location.href = "/api/calendar/connect?returnTo=/";
          }}
        >
          Connect Google Calendar
        </DropdownMenuItem>
      </>
    );
  }

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled>
        Google Calendar {connectionPhase === "oauth_connected" ? "connected" : "ready"}
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => {
          void fetch("/api/calendar/disconnect", { method: "DELETE" }).then(() => refresh());
        }}
      >
        Disconnect calendar
      </DropdownMenuItem>
    </>
  );
}
