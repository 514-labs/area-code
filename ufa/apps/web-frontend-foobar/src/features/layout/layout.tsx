import { useLocation } from "@tanstack/react-router";
import { AppSidebar } from "@workspace/ui";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { CSSProperties, ReactNode } from "react";
import { navigationConfig } from "./navigation-config";
import { AppHeader } from "./app-header";
import AreaCodeLogo from "@/components/logos/area-code-logo";
import ResizableChatLayout from "./resizable-chat-layout";

interface LayoutProps {
  children: ReactNode;
}

// Create stable components that don't re-render when chat state changes
function MainContent({ children }: { children: ReactNode }) {
  console.log("Rendering MainContent");
  const location = useLocation();

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        currentPath={location.pathname}
        navMain={navigationConfig.navMain}
        navSecondary={navigationConfig.navSecondary}
        user={navigationConfig.user}
        topHero={
          <a href="/" className="flex items-center gap-2">
            <AreaCodeLogo className="w-[32.5px] h-[16px] text-black dark:text-white" />
            <span className="text-base font-semibold">Area Code</span>
          </a>
        }
      />
      <SidebarInset>
        <AppHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <ResizableChatLayout>
      <MainContent>{children}</MainContent>
    </ResizableChatLayout>
  );
}
