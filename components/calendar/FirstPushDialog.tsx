"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FirstPushDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
  needsOAuth: boolean;
  onConnect: () => void;
};

export function FirstPushDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  needsOAuth,
  onConnect,
}: FirstPushDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish to Google Calendar</DialogTitle>
          <DialogDescription>
            This will add a Labmate calendar to your Google Calendar. All events in this series will
            appear there and stay in sync.
          </DialogDescription>
        </DialogHeader>

        {isSubmitting ? (
          <div className="flex items-center gap-2 rounded-md border bg-[#f8fafc] px-3 py-3 text-sm text-[#334155]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Creating your Labmate calendar and publishing events…
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          {needsOAuth ? (
            <Button type="button" onClick={onConnect} disabled={isSubmitting}>
              Connect Google Calendar
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                void onConfirm();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Publishing…" : "Publish"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
