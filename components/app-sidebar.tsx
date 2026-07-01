"use client";

import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "@/components/auth/account-menu";
import { HelpMenu } from "@/components/help/help-menu";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Labmate">
              <Link href="/">
                <span className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  <Image src="/android-chrome-192x192.png" alt="" width={32} height={32} className="size-full object-cover" />
                </span>
                <span className="truncate font-semibold">Labmate</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarFooter className="mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <AccountMenu />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SettingsDialog />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <HelpMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
