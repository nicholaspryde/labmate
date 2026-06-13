"use client";

import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MAX_MESSAGE_LENGTH = 2000;

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
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
      setOpen(false);
      toast.success("Thanks for the feedback!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send feedback");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Send feedback"
          className="fixed bottom-4 right-4 z-50 h-8 gap-1.5 rounded-full border-border/80 bg-background/95 px-3 text-xs shadow-sm backdrop-blur-sm"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          Feedback
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-80 space-y-3 p-3"
      >
        <div className="space-y-1">
          <Label htmlFor="feedback-message" className="text-sm font-medium">
            Send feedback
          </Label>
          <p className="text-xs text-muted-foreground">
            Share bugs, ideas, or features you&apos;d like to see in Labmate.
          </p>
        </div>
        <textarea
          id="feedback-message"
          value={message}
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
      </PopoverContent>
    </Popover>
  );
}
