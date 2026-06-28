"use client";

import { LogIn, LogOut, User2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type AccountMenuProps = {
  className?: string;
};

export function AccountMenu({ className }: AccountMenuProps) {
  const { user, loading, isConfigured, signOut } = useAuth();

  if (!isConfigured) {
    return null;
  }

  if (loading) {
    return (
      <SidebarMenuButton disabled className={className} tooltip="Account">
        <User2 />
        <span>Account</span>
      </SidebarMenuButton>
    );
  }

  if (!user) {
    return (
      <SidebarMenuButton asChild className={className} tooltip="Sign in">
        <Link href="/login">
          <LogIn />
          <span>Sign in</span>
        </Link>
      </SidebarMenuButton>
    );
  }

  const email = user.email ?? "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className={cn(className)} tooltip={email}>
          <User2 />
          <span className="truncate">{email}</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          {email}
        </DropdownMenuItem>
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
