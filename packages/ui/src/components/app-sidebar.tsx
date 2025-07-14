import * as React from "react";
import { Zap } from "lucide-react";

import { NavMain, type NavMainItem } from "@workspace/ui/components/nav-main";
import {
  NavSecondary,
  type NavItem,
} from "@workspace/ui/components/nav-secondary";
import { NavUser } from "@workspace/ui/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentPath?: string;
  navMain: (NavMainItem | React.ReactNode)[];
  navSecondary: (NavItem | React.ReactNode)[];
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}

export function AppSidebar({
  currentPath,
  navMain,
  navSecondary,
  user,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <Zap className="!size-5" />
                <span className="text-base font-semibold">Area Code</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} currentPath={currentPath} />
        <NavSecondary
          items={navSecondary}
          currentPath={currentPath}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
