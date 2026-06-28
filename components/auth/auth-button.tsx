"use client";

import { CalendarConnectionMenuItems } from "@/components/calendar/CalendarConnectionMenu";
import { LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AuthButtonProps = {
  className?: string;
};

export function AuthButton({ className }: AuthButtonProps) {
  const { user, loading, isConfigured, signOut } = useAuth();

  if (!isConfigured) {
    return null;
  }

  if (loading) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn("fixed bottom-4 right-4 z-50 h-9 w-9 rounded-full", className)}
        disabled
        aria-label="Loading account"
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label="Sign in"
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "fixed bottom-4 right-4 z-50 h-9 w-9 rounded-full bg-background/95 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.8)] backdrop-blur-sm",
          className,
        )}
      >
        <LogIn className="h-4 w-4" aria-hidden />
      </Link>
    );
  }

  const email = user.email ?? "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "fixed bottom-4 right-4 z-50 h-9 max-w-[220px] rounded-full bg-background/95 px-3 text-xs shadow-[inset_0_0_0_1px_hsl(var(--border)/0.8)] backdrop-blur-sm",
            className,
          )}
        >
          <span className="truncate">{email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <CalendarConnectionMenuItems />
        <DropdownMenuItem
          onSelect={() => {
            void signOut();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
