import { NavMain, type NavMainItem } from "./nav-main";
import { NavSecondary, type NavItem } from "./nav-secondary";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { ComponentProps, ReactNode } from "react";

export type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  currentPath?: string;
  navMain: (NavMainItem | ReactNode)[];
  navSecondary: (NavItem | ReactNode)[];
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  topHero: ReactNode;
};

export function AppSidebar({
  currentPath,
  navMain,
  navSecondary,
  user,
  topHero,
  variant = "inset",
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 items-center"
            >
              {topHero}
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
