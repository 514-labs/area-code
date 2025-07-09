import * as React from "react";
import {
  Home,
  Package,
  BarChart,
  Settings,
  HelpCircle,
  Search,
  Zap,
} from "lucide-react";

import { NavMain } from "@workspace/ui/components/nav-main";
import { NavSecondary } from "@workspace/ui/components/nav-secondary";
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

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
    },
    {
      title: "Foo",
      url: "/foo",
      icon: Package,
    },
    {
      title: "Bar",
      url: "/bar",
      icon: BarChart,
    },
  ],
  navClouds: [],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: HelpCircle,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
};

export function AppSidebar({
  currentPath,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  currentPath?: string;
}) {
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
        <NavMain items={data.navMain} currentPath={currentPath} />
        <NavSecondary
          items={data.navSecondary}
          currentPath={currentPath}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
