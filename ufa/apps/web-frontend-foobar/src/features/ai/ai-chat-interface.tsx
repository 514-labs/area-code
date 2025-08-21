"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquare, X, AlertTriangle } from "lucide-react";
import { Button, useTheme } from "@workspace/ui";
import { getTransactionApiBase } from "@/env-vars";
import ChatOutputArea from "./chat-output-area";
import { SuggestedPrompt } from "./suggested-prompt";
import { ThemeProvider } from "@thesysai/genui-sdk";
import ChatInput from "./chat-input";
import { useThesysStatus } from "./use-thesys-status";
import { useEffect, useMemo, useState } from "react";
import { generateC1Typography } from "@/utils/generateC1Typography";

function MissingKeyMessage() {
  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border rounded-lg p-6 max-w-md mx-4 text-center shadow-lg">
        <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Thesys Key Missing</h3>
        <p className="text-muted-foreground mb-4">
          If you want to use the agent and the MCPs, follow the /ufa readme to
          add the key.
        </p>
      </div>
    </div>
  );
}

type AiChatInterfaceProps = {
  onClose?: () => void;
};

export default function AiChatInterface({ onClose }: AiChatInterfaceProps) {
  const { data: thesysStatus, isLoading: isStatusLoading } = useThesysStatus();
  const [c1ThemeMode, setC1ThemeMode] = useState<"dark" | "light">("light");
  const theme = useTheme();

  useEffect(() => {
    if (theme.theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      setC1ThemeMode(systemTheme);
    } else {
      setC1ThemeMode(theme.theme);
    }
  }, [theme]);

  const [toolTimings, setToolTimings] = useState<Record<string, number>>({});

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${getTransactionApiBase()}/chat`,
    }),
    onData: (data: any) => {
      if (data.type === "data-tool-timing") {
        const { toolCallId, duration } = data.data as {
          toolCallId: string;
          duration: number;
        };
        setToolTimings((prev) => ({
          ...prev,
          [toolCallId]: duration,
        }));
      }
    },
  });

  const handleSuggestedPromptClick = (prompt: string) => {
    sendMessage({ text: prompt });
  };

  const handleSendMessage = (text: string) => {
    sendMessage({ text });
  };

  const isEmptyState = messages.length === 0;
  const showKeyMissingOverlay =
    !isStatusLoading && thesysStatus && !thesysStatus.thesysKeyAvailable;

  const commonSystemTheme = {
    ...generateC1Typography("system-ui"),
    defaultChartPalette: [
      "#F54900",
      "#009689",
      "#104E64",
      "#FFB900",
      "#FE9A00",
    ],
  };

  return (
    <div className="w-full h-full flex flex-col bg-sidebar text-foreground overflow-hidden relative">
      {/* Main content */}
      <div className="flex-none py-3 px-4">
        <div className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span>Chat</span>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-accent"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden py-3">
        <div className="max-w-full overflow-y-auto h-full pl-2.5 pr-4">
          <ThemeProvider
            mode={c1ThemeMode}
            darkTheme={{ ...commonSystemTheme }}
            theme={{ ...commonSystemTheme }}
          >
            <ChatOutputArea
              messages={messages}
              status={status}
              toolTimings={toolTimings}
            />
          </ThemeProvider>
        </div>
      </div>

      {isEmptyState && (
        <SuggestedPrompt onPromptClick={handleSuggestedPromptClick} />
      )}

      <ChatInput sendMessage={handleSendMessage} status={status} />

      {/* Overlay when Thesys key is missing */}
      {showKeyMissingOverlay && <MissingKeyMessage />}
    </div>
  );
}
