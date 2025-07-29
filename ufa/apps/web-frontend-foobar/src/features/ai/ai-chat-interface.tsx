"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { Button, Textarea, cn } from "@workspace/ui";
import { getTransactionApiBase } from "@/env-vars";
import ChatOutputArea from "./chat-output-area";
import { SuggestedPrompt } from "./suggested-prompt";

export default function AiChatInterface() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${getTransactionApiBase()}/chat`,
    }),
  });
  const [input, setInput] = useState("");

  const handleSetInput = (input: string) => {
    setInput(input);
    sendMessage({ text: input });
  };

  const handleSuggestedPromptClick = (prompt: string) => {
    sendMessage({ text: prompt });
  };

  const isEmptyState = messages.length === 0;

  return (
    <div className="w-full h-full flex flex-col bg-sidebar text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex-none py-3 px-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span>Chat</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-hidden p-3">
        <div className="max-w-full overflow-y-auto h-full">
          <ChatOutputArea messages={messages} />
        </div>
      </div>

      {isEmptyState && (
        <SuggestedPrompt onPromptClick={handleSuggestedPromptClick} />
      )}

      {/* Input */}
      <div className="flex-none p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              handleSetInput(input);
            }
          }}
          className="w-full space-y-3"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== "ready"}
            placeholder="Ask a question..."
            className={cn(
              "min-h-[60px] text-sm resize-none",
              "bg-background border-input",
              "placeholder:text-muted-foreground",
              "focus:ring-ring focus:border-ring"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) {
                  handleSetInput(input);
                }
              }
            }}
          />
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={status !== "ready" || !input.trim()}
              className={cn(
                "h-7 px-3",
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "disabled:opacity-50 disabled:pointer-events-none"
              )}
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
