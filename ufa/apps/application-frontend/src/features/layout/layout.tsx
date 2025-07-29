import { useLocation } from "@tanstack/react-router";
import { AppSidebar } from "@workspace/ui/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import {
  CSSProperties,
  ReactNode,
  useMemo,
  useCallback,
  useState,
} from "react";
import { navigationConfig } from "./navigation-config";
import { AppHeader } from "./app-header";
import AreaCodeLogo from "@/components/logos/area-code-logo";
import AiChatInterface from "@/features/ai/ai-chat-interface";
import ResizableChatLayout from "./resizable-chat-layout";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleChatToggle = useCallback(() => {
    setIsChatOpen((prev) => !prev);
  }, []);

  const leftContent = useMemo(
    () => (
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
          <AppHeader onChatToggle={handleChatToggle} />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    ),
    [location.pathname, handleChatToggle, children]
  );

  const rightContent = useMemo(
    () => (
      <div className="h-screen border-l bg-background">
        <AiChatInterface />
      </div>
    ),
    []
  );

  return (
    <ResizableChatLayout
      leftContent={leftContent}
      rightContent={rightContent}
      isChatOpen={isChatOpen}
      minChatWidthPx={300}
      maxChatWidthPx={600}
      defaultChatWidthPx={400}
    />
  );
}
