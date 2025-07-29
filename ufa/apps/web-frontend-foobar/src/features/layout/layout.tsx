import { useLocation } from "@tanstack/react-router";
import { AppSidebar, useSaveInLocalStorage } from "@workspace/ui";
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

const CHAT_OPEN_STORAGE_KEY = "area-code-chat-open";

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const saveToLocalStorage = useSaveInLocalStorage(300);

  const [isChatOpen, setIsChatOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CHAT_OPEN_STORAGE_KEY);
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const handleChatToggle = useCallback(() => {
    setIsChatOpen((prev: boolean) => {
      const newValue = !prev;
      saveToLocalStorage(CHAT_OPEN_STORAGE_KEY, newValue);
      return newValue;
    });
  }, [saveToLocalStorage]);

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

  const rightContent = useMemo(() => <AiChatInterface />, []);

  return (
    <ResizableChatLayout
      leftContent={leftContent}
      rightContent={rightContent}
      isChatOpen={isChatOpen}
    />
  );
}
