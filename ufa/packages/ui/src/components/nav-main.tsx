import * as React from "react";
import { type LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
}

export function NavMain({
  items,
  currentPath,
}: {
  items: (NavMainItem | React.ReactNode)[];
  currentPath?: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item, index) => {
            // If it's a React node, render it directly
            if (React.isValidElement(item)) {
              return <SidebarMenuItem key={index}>{item}</SidebarMenuItem>;
            }

            // If it's a NavMainItem object, render it as before
            const navItem = item as NavMainItem;
            const isActive = currentPath === navItem.url;

            return (
              <SidebarMenuItem key={navItem.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={navItem.title}
                  isActive={isActive}
                >
                  <a href={navItem.url}>
                    {navItem.icon && <navItem.icon />}
                    <span>{navItem.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
