"use client";

import * as React from "react";
import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { Link } from "@tanstack/react-router";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  action?: () => void;
}

export function NavSecondary({
  items,
  currentPath,
  ...props
}: {
  items: (NavItem | React.ReactNode)[];
  currentPath?: string;
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item, index) => {
            // If it's a React node, render it directly
            if (React.isValidElement(item)) {
              return <SidebarMenuItem key={index}>{item}</SidebarMenuItem>;
            }

            // If it's a NavItem object, render it as before
            const navItem = item as NavItem;
            const isActive = currentPath === navItem.url;

            return (
              <SidebarMenuItem key={navItem.title}>
                {navItem.action ? (
                  <SidebarMenuButton
                    onClick={navItem.action}
                    isActive={isActive}
                    className="cursor-pointer"
                  >
                    <navItem.icon />
                    <span>{navItem.title}</span>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link to={navItem.url}>
                      <navItem.icon />
                      <span>{navItem.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
