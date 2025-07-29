import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
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

export default function ResizableChatLayout({
  leftContent,
  rightContent,
  isChatOpen,
  minChatWidthPx = 300,
  maxChatWidthPx = 600,
  defaultChatWidthPx = 400,
  className = "h-full",
}: ResizableChatLayoutProps) {
  const chatPanelRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastChatSize, setLastChatSize] = useState<number | null>(null);

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

  // Handle manual resizing - remember the user's preferred size
  const handlePanelResize = (size: number) => {
    if (isChatOpen && size > 0) {
      setLastChatSize(size);
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
        className={`h-full ${!isDragging ? "panel-group-animated" : ""}`}
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
          <div className={`h-full`}>{rightContent}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
