"use client";

import { useState } from "react";
import type { PushPreviewResponse } from "@/hooks/use-calendar-sync";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PushPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: PushPreviewResponse | null;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
};

export function PushPreviewDialog({
  open,
  onOpenChange,
  preview,
  onConfirm,
  isSubmitting,
}: PushPreviewDialogProps) {
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const hasRemovals = (preview?.summary.removed ?? 0) > 0;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmRemoval(false);
    }
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (hasRemovals && !confirmRemoval) {
      setConfirmRemoval(true);
      return;
    }

    await onConfirm();
    setConfirmRemoval(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review calendar changes</DialogTitle>
          <DialogDescription>
            These updates will be published to your Labmate Google Calendar.
          </DialogDescription>
        </DialogHeader>

        {preview ? (
          <div className="space-y-2 rounded-md border bg-white p-3 text-sm">
            {preview.summary.updated > 0 ? (
              <p>{preview.summary.updated} event{preview.summary.updated === 1 ? "" : "s"} updated</p>
            ) : null}
            {preview.summary.added > 0 ? (
              <p>{preview.summary.added} event{preview.summary.added === 1 ? "" : "s"} added</p>
            ) : null}
            {preview.summary.removed > 0 ? (
              <p className="text-[#9b1c1c]">
                {preview.summary.removed} event{preview.summary.removed === 1 ? "" : "s"} removed
              </p>
            ) : null}
            {preview.summary.added === 0 &&
            preview.summary.updated === 0 &&
            preview.summary.removed === 0 ? (
              <p>No changes to publish.</p>
            ) : null}
          </div>
        ) : null}

        {confirmRemoval ? (
          <p className="rounded-md border border-[#f5c2c2] bg-[#fff5f5] px-3 py-2 text-sm text-[#9b1c1c]">
            {preview?.summary.removed ?? 0} event
            {(preview?.summary.removed ?? 0) === 1 ? "" : "s"} will be removed from your Google
            Calendar. Continue?
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={confirmRemoval ? "destructive" : "default"}
            disabled={isSubmitting || !preview}
            onClick={() => {
              void handleConfirm();
            }}
          >
            {isSubmitting ? "Publishing…" : confirmRemoval ? "Remove and publish" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
