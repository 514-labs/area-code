import * as React from "react";
import { Home, Package, BarChart } from "lucide-react";
import { type NavMainItem } from "@workspace/ui/components/nav-main";
import { type NavItem } from "@workspace/ui/components/nav-secondary";
import { SidebarThemeToggle } from "./sidebar-theme-toggle";
import { SidebarCacheToggle } from "./sidebar-cache-toggle";

export const navigationConfig = {
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
  ] as NavMainItem[],
  navSecondary: [
    <SidebarThemeToggle key="theme-toggle" />,
    <SidebarCacheToggle key="cache-toggle" />,
  ] as (NavItem | React.ReactNode)[],
};
