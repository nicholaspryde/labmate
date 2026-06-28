"use client";

import { Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import type { ConnectionPhase } from "@/hooks/use-calendar-sync";

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
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
    if (!open) {
      return;
    }
    void refresh();
  }, [open, refresh]);

  const handleConnect = () => {
    window.location.href = "/api/calendar/connect?returnTo=/";
  };

  const handleDisconnect = async () => {
    await fetch("/api/calendar/disconnect", { method: "DELETE" });
    await refresh();
  };

  return (
    <>
      <SidebarMenuButton tooltip="Settings" onClick={() => setOpen(true)}>
        <Settings />
        <span>Settings</span>
      </SidebarMenuButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Manage your Labmate preferences and integrations.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Google Calendar</h3>
              {connectionPhase === "not_connected" ? (
                <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <p className="text-sm text-muted-foreground">Not connected</p>
                  <Button type="button" size="sm" onClick={handleConnect}>
                    Connect
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <p className="text-sm text-muted-foreground">
                    {connectionPhase === "oauth_connected" ? "Connected" : "Ready"}
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={() => void handleDisconnect()}>
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
