"use client";

import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { DISABLE_AUTOFILL_INPUT_PROPS } from "@/lib/autofill";
import { cn } from "@/lib/utils";

const MAX_MESSAGE_LENGTH = 2000;

export function HelpButton() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const trimmedMessage = message.trim();
  const canSend = trimmedMessage.length > 0 && !isSending;

  const handleSend = async () => {
    if (!canSend) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to send feedback");
      }

      setMessage("");
      setFeedbackOpen(false);
      toast.success("Thanks for the feedback!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send feedback");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Help"
            className="fixed bottom-4 left-4 z-50 h-9 w-9 rounded-full bg-background/95 text-muted-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)/0.8)] backdrop-blur-sm hover:text-foreground"
          >
            <CircleHelp className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" sideOffset={8}>
          <DropdownMenuItem onSelect={() => setAboutOpen(true)}>What is this?</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setFeedbackOpen(true)}>Send feedback</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What is this?</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-foreground/80">
              A tool I was inspired to make by my wife, who works in research. She told me how
              annoying it was to do the time math when planning experiments.
            </DialogDescription>
            <p className="text-sm leading-relaxed text-foreground/80">
              I made it for scientists — but really it&apos;s for anyone who needs to create a bunch
              of calendar events that are timed relative to each other.
            </p>
            <p className="text-sm text-muted-foreground">
              Built by{" "}
              <a
                href="https://nickpry.de"
                target="_blank"
                rel="noopener noreferrer"
                className="hover-link"
              >
                <span>Nick Pryde</span>
              </a>
            </p>
          </DialogHeader>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send feedback</DialogTitle>
            <DialogDescription>
              Share bugs, ideas, or features you&apos;d like to see in Labmate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="feedback-message" className="sr-only">
              Feedback message
            </Label>
            <textarea
              id="feedback-message"
              value={message}
              {...DISABLE_AUTOFILL_INPUT_PROPS}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What would make Labmate better?"
              rows={4}
              maxLength={MAX_MESSAGE_LENGTH}
              disabled={isSending}
              className={cn(
                "flex min-h-[96px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {message.length}/{MAX_MESSAGE_LENGTH}
              </span>
              <Button type="button" size="sm" disabled={!canSend} onClick={handleSend}>
                {isSending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
