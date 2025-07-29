"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { Button, Textarea, ScrollArea, cn } from "@workspace/ui";
import { getTransactionApiBase } from "@/env-vars";
import ChatOutputArea from "./chat-output-area";

export default function AiChatInterface() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${getTransactionApiBase()}/chat`,
    }),
  });
  const [input, setInput] = useState("");

  return (
    <div className="relative h-full">
      <div
        className={cn(
          "sticky top-0 left-0 w-full h-full flex flex-col",
          "bg-background text-foreground"
        )}
      >
        {/* Header */}
        <div className="flex-none py-3 px-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span>Chat</span>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-3">
          <ChatOutputArea messages={messages} />
        </ScrollArea>

        {/* Input */}
        <div className="flex-none p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) {
                sendMessage({ text: input });
                setInput("");
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
                    sendMessage({ text: input });
                    setInput("");
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
    </div>
  );
}
