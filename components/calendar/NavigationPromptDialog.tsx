"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type NavigationPromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPush: () => void;
  onSkip: () => void;
};

export function NavigationPromptDialog({
  open,
  onOpenChange,
  onPush,
  onSkip,
}: NavigationPromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unsynced calendar changes</DialogTitle>
          <DialogDescription>
            You have unsynced changes — push to calendar now?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onSkip}>
            Skip
          </Button>
          <Button type="button" onClick={onPush}>
            Push
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
