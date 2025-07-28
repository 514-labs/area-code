import { useLocation } from "@tanstack/react-router";
import { AppSidebar } from "@workspace/ui/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui";
import { CSSProperties, ReactNode, useState, useRef, useEffect } from "react";
import { navigationConfig } from "./navigation-config";
import { AppHeader } from "./app-header";
import AreaCodeLogo from "@/components/logos/area-code-logo";
import AiChatInterface from "@/features/ai/ai-chat-interface";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatPanelRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Pixel constraints for chat panel
  const MIN_CHAT_WIDTH_PX = 300; // minimum 300px
  const MAX_CHAT_WIDTH_PX = 600; // maximum 600px
  const DEFAULT_CHAT_WIDTH_PX = 400; // default 400px

  // Calculate percentage values from pixel constraints
  const minChatPercent =
    containerWidth > 0
      ? Math.max(0, (MIN_CHAT_WIDTH_PX / containerWidth) * 100)
      : 0;
  const maxChatPercent =
    containerWidth > 0
      ? Math.min(100, (MAX_CHAT_WIDTH_PX / containerWidth) * 100)
      : 40;
  const defaultChatPercent =
    containerWidth > 0
      ? Math.min(maxChatPercent, (DEFAULT_CHAT_WIDTH_PX / containerWidth) * 100)
      : 25;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);

    // Set initial width
    setContainerWidth(container.getBoundingClientRect().width);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
  };

  // Handle panel resizing after state changes
  useEffect(() => {
    if (chatPanelRef.current) {
      if (isChatOpen) {
        chatPanelRef.current.resize(defaultChatPercent);
      } else {
        chatPanelRef.current.resize(0);
      }
    }
  }, [isChatOpen, defaultChatPercent]);

  return (
    <div ref={containerRef} className="h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel
          id="main-panel"
          defaultSize={100}
          minSize={50}
          order={1}
        >
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
        </ResizablePanel>

        {isChatOpen && <ResizableHandle id="chat-handle" withHandle />}

        <ResizablePanel
          ref={chatPanelRef}
          id="chat-panel"
          defaultSize={0}
          minSize={isChatOpen ? minChatPercent : 0}
          maxSize={maxChatPercent}
          order={2}
        >
          <div
            className={`h-screen border-l bg-background transition-opacity duration-300 ease-in-out ${
              isChatOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <AiChatInterface />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
