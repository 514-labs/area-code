import { useLocation, Link } from "@tanstack/react-router";
import { AppSidebar } from "./app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { CSSProperties, ReactNode } from "react";
import { navigationConfig } from "./navigation-config";
import { AppHeader } from "./app-header";
import AreaCodeLogo from "@/components/logos/area-code-logo";

interface LayoutProps {
  children: ReactNode;
}

// Create stable components that don't re-render when chat state changes
function MainContent({ children }: { children: ReactNode }) {
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
          <Link to="/" className="flex items-center gap-2">
            <AreaCodeLogo className="w-[32.5px] h-[16px] text-black dark:text-white" />
            <span className="text-base font-semibold">Area Code Lite</span>
          </Link>
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
    <div className="flex flex-col h-full max-h-screen">
      <div className="h-full overflow-auto">
        <MainContent>{children}</MainContent>
      </div>
    </div>
  );
}
