import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  useSaveInLocalStorage,
} from "@workspace/ui";
import { ReactNode, useState, useRef, useEffect } from "react";

type ResizableChatLayoutProps = {
  leftContent: ReactNode;
  rightContent: ReactNode;
  isChatOpen: boolean;
  minChatWidthPx?: number;
  maxChatWidthPx?: number;
  defaultChatWidthPx?: number;
  className?: string;
};

const CHAT_SIZE_STORAGE_KEY = "area-code-chat-size";

export default function ResizableChatLayout({
  leftContent,
  rightContent,
  isChatOpen,
  minChatWidthPx = 400,
  maxChatWidthPx = 700,
  defaultChatWidthPx = 500,
  className = "h-full",
}: ResizableChatLayoutProps) {
  const chatPanelRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const saveToLocalStorage = useSaveInLocalStorage(300);

  const [lastChatSize, setLastChatSize] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CHAT_SIZE_STORAGE_KEY);
      return saved ? parseFloat(saved) : null;
    }
    return null;
  });

  // Calculate percentage values from pixel constraints
  const minChatPercent =
    containerWidth > 0
      ? Math.max(0, (minChatWidthPx / containerWidth) * 100)
      : 0;
  const maxChatPercent =
    containerWidth > 0
      ? Math.min(100, (maxChatWidthPx / containerWidth) * 100)
      : 40;
  const defaultChatPercent =
    containerWidth > 0
      ? Math.min(maxChatPercent, (defaultChatWidthPx / containerWidth) * 100)
      : 25;

  // Use last user size if available, otherwise use default
  const targetChatSize = lastChatSize || defaultChatPercent;

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
          defaultSize={100}
          minSize={50}
          order={1}
        >
          {leftContent}
        </ResizablePanel>

        {isChatOpen && (
          <ResizableHandle
            id="chat-handle"
            withHandle
            className="transition-opacity duration-[300ms] ease-out"
            onDragging={setIsDragging}
          />
        )}

        <ResizablePanel
          ref={chatPanelRef}
          id="chat-panel"
          defaultSize={0}
          minSize={isChatOpen ? minChatPercent : 0}
          maxSize={maxChatPercent}
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
