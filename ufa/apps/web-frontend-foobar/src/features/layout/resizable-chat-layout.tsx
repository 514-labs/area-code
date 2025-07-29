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
  minChatWidthPx?: number;
  maxChatWidthPx?: number;
  defaultChatWidthPx?: number;
  className?: string;
};

export const CHAT_SIZE_STORAGE_KEY = "area-code-chat-size";

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

  const [lastChatSize, setLastChatSize] = useState<number | null>(null);

  const [savedChatSizePixels] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CHAT_SIZE_STORAGE_KEY);
      console.log("saved", saved);
      return saved ? parseFloat(saved) : defaultChatWidthPx;
    }
    return defaultChatWidthPx;
  });

  const savedChatPercent = useMemo(() => {
    const clampedPixels = Math.min(
      maxChatWidthPx,
      Math.max(minChatWidthPx, savedChatSizePixels)
    );

    if (typeof window !== "undefined") {
      const percentage = (clampedPixels / window.innerWidth) * 100;
      console.log(
        "clampedPixels",
        clampedPixels,
        window.innerWidth,
        "percentage",
        percentage
      );
      return percentage;
    }
    return 25;
  }, [savedChatSizePixels, minChatWidthPx, maxChatWidthPx]);

  const minChatPercent = useMemo(() => {
    if (typeof window !== "undefined") {
      return Math.max(0, (minChatWidthPx / window.innerWidth) * 100);
    }
    return 0;
  }, [minChatWidthPx]);

  const maxChatPercent = useMemo(() => {
    if (typeof window !== "undefined") {
      return Math.min(100, (maxChatWidthPx / window.innerWidth) * 100);
    }
    return 40;
  }, [maxChatWidthPx]);

  const targetChatSize = lastChatSize ?? savedChatPercent;

  const initialDefaultSize = isChatOpen
    ? (lastChatSize ?? savedChatPercent)
    : 0;

  const mainPanelDefaultSize = isChatOpen ? 100 - initialDefaultSize : 100;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);

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
    if (isChatOpen && size > 0 && containerWidth > 0) {
      const actualPixels = (size / 100) * containerWidth;
      setLastChatSize(size);
      saveToLocalStorage(CHAT_SIZE_STORAGE_KEY, actualPixels);
      console.log("saved pixel at value", actualPixels);
    }
  };

  console.log("initialDefaultSize", initialDefaultSize);
  console.log("mainPanelDefaultSize", mainPanelDefaultSize);
  console.log("minChatPercent", minChatPercent);
  console.log("maxChatPercent", maxChatPercent);

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
            className="transition-opacity duration-[300ms] ease-out opacity-0 hover:opacity-100"
            onDragging={setIsDragging}
          />
        )}

        <ResizablePanel
          ref={chatPanelRef}
          id="chat-panel"
          defaultSize={initialDefaultSize}
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
