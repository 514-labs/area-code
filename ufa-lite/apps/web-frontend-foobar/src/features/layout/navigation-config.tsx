import * as React from "react";
import { Home, Package, BarChart } from "lucide-react";
import { type NavMainItem } from "./nav-main";
import { type NavItem } from "./nav-secondary";
import { SidebarThemeToggle } from "../theme/sidebar-theme-toggle";
import { SidebarFrontendCacheToggle } from "../frontend-caching/sidebar-frontend-cache-toggle";
import { SidebarGithubButton } from "./sidebar-github-button";
import { OriginHighlightsCheckboxes } from "../origin-highlights/origin-highlights-checkboxes";

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
    <OriginHighlightsCheckboxes key="origin-highlights-checkboxes" />,
    <SidebarThemeToggle key="theme-toggle" />,
    <SidebarFrontendCacheToggle key="cache-toggle" />,
    <SidebarGithubButton key="github-button" />,
  ] as (NavItem | React.ReactNode)[],
};
