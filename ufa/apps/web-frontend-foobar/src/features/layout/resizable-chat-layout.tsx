import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  useSaveInLocalStorage,
} from "@workspace/ui";
import {
  ReactNode,
  useState,
  useRef,
  useEffect,
  useMemo,
  createContext,
  useContext,
} from "react";
import AiChatInterface from "@/features/ai/ai-chat-interface";

type ResizableChatLayoutProps = {
  children: ReactNode;
  minChatWidthPX?: number;
  maxChatWidthPercent?: number;
  defaultChatWidthPercent?: number;
  className?: string;
};

type ChatLayoutContextType = {
  isChatOpen: boolean;
  toggleChat: () => void;
  closeChat: () => void;
};

const ChatLayoutContext = createContext<ChatLayoutContextType | null>(null);

export function useChatLayout() {
  const context = useContext(ChatLayoutContext);
  if (!context) {
    throw new Error("useChatLayout must be used within a ResizableChatLayout");
  }
  return context;
}

export const CHAT_SIZE_STORAGE_KEY = "area-code-chat-size";
const CHAT_OPEN_STORAGE_KEY = "area-code-chat-open";

export default function ResizableChatLayout({
  children,
  minChatWidthPX = 400,
  maxChatWidthPercent = 40,
  defaultChatWidthPercent = 30,
  className = "h-full",
}: ResizableChatLayoutProps) {
  const saveChatSizeInLocalStorage = useSaveInLocalStorage(
    CHAT_SIZE_STORAGE_KEY,
    300
  );
  const saveChatOpenInLocalStorage = useSaveInLocalStorage(
    CHAT_OPEN_STORAGE_KEY,
    0
  );

  // Chat state management
  const [isChatOpen, setIsChatOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CHAT_OPEN_STORAGE_KEY);
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const toggleChat = () => {
    const newValue = !isChatOpen;
    setIsChatOpen(newValue);
    saveChatOpenInLocalStorage(newValue);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    saveChatOpenInLocalStorage(false);
  };

  // Panel sizing logic
  const chatPanelRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
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
      saveChatSizeInLocalStorage(size);
    }
  };

  const contextValue = useMemo(
    () => ({
      isChatOpen,
      toggleChat,
      closeChat,
    }),
    [isChatOpen, toggleChat, closeChat]
  );

  return (
    <ChatLayoutContext.Provider value={contextValue}>
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
            {children}
          </ResizablePanel>

          <ResizableHandle
            id="chat-handle"
            className={`transition-opacity duration-[300ms] ease-out w-[2px] ${
              isChatOpen
                ? "opacity-0 hover:opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
            onDragging={setIsDragging}
          />

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
              <AiChatInterface onClose={closeChat} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </ChatLayoutContext.Provider>
  );
}
