import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  useSaveInLocalStorage,
} from "@workspace/ui";
import { ReactNode, useState, useRef, useEffect, useMemo } from "react";

type ResizableChatLayoutProps = {
  leftContent: ReactNode;
  rightContent: ReactNode;
  isChatOpen: boolean;
  minChatWidthPX?: number;
  maxChatWidthPercent?: number;
  defaultChatWidthPercent?: number;
  className?: string;
};

export const CHAT_SIZE_STORAGE_KEY = "area-code-chat-size";

export default function ResizableChatLayout({
  leftContent,
  rightContent,
  isChatOpen,
  minChatWidthPX = 400,
  maxChatWidthPercent = 40,
  defaultChatWidthPercent = 30,
  className = "h-full",
}: ResizableChatLayoutProps) {
  const chatPanelRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const saveToLocalStorage = useSaveInLocalStorage(300);

  const [lastChatSize, setLastChatSize] = useState<number | null>(null);

  const [savedChatSizePercent] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CHAT_SIZE_STORAGE_KEY);
      return saved ? parseFloat(saved) : defaultChatWidthPercent;
    }
    return defaultChatWidthPercent;
  });

  const savedChatPercent = useMemo(() => {
    const minChatPercent =
      typeof window !== "undefined"
        ? Math.max(0, (minChatWidthPX / window.innerWidth) * 100)
        : 0;

    const clampedPercent = Math.min(
      maxChatWidthPercent,
      Math.max(minChatPercent, savedChatSizePercent)
    );

    return clampedPercent;
  }, [savedChatSizePercent, minChatWidthPX, maxChatWidthPercent]);

  const minChatPercent = useMemo(() => {
    if (typeof window !== "undefined") {
      return Math.max(0, (minChatWidthPX / window.innerWidth) * 100);
    }
    return 0;
  }, [minChatWidthPX]);

  const targetChatSize = lastChatSize ?? savedChatPercent;

  const initialDefaultSize = isChatOpen
    ? (lastChatSize ?? savedChatPercent)
    : 0;

  const mainPanelDefaultSize = isChatOpen ? 100 - initialDefaultSize : 100;

  useEffect(() => {
    if (chatPanelRef.current) {
      if (isChatOpen) {
        chatPanelRef.current.resize(targetChatSize);
      } else {
        chatPanelRef.current.resize(0);
      }
    }
  }, [isChatOpen, targetChatSize]);

  const handlePanelResize = (size: number) => {
    if (isChatOpen && size > 0) {
      setLastChatSize(size);
      saveToLocalStorage(CHAT_SIZE_STORAGE_KEY, size);
    }
  };

  return (
    <div ref={containerRef} className={className}>
      <style>
        {`
          .panel-group-animated [data-panel] {
            transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          
          [data-panel-resize-handle] {
            transition: opacity 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
        `}
      </style>
      <ResizablePanelGroup
        direction="horizontal"
        className={`relative ${!isDragging ? "panel-group-animated" : ""}`}
      >
        <ResizablePanel
          id="main-panel"
          defaultSize={mainPanelDefaultSize}
          order={1}
        >
          {leftContent}
        </ResizablePanel>

        {isChatOpen && (
          <ResizableHandle
            id="chat-handle"
            className="transition-opacity duration-[300ms] ease-out opacity-0 hover:opacity-100 w-[2px]"
            onDragging={setIsDragging}
          />
        )}

        <ResizablePanel
          ref={chatPanelRef}
          id="chat-panel"
          defaultSize={initialDefaultSize}
          minSize={isChatOpen ? minChatPercent : 0}
          maxSize={maxChatWidthPercent}
          order={2}
          onResize={handlePanelResize}
        >
          <div
            className="fixed h-screen"
            style={{
              width: `${targetChatSize}%`,
            }}
          >
            {rightContent}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
