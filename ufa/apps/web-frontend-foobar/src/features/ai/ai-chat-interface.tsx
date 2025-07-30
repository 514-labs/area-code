"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@workspace/ui";
import { getTransactionApiBase } from "@/env-vars";
import ChatOutputArea from "./chat-output-area";
import { SuggestedPrompt } from "./suggested-prompt";
import ChatInput from "./chat-input";

type AiChatInterfaceProps = {
  onClose?: () => void;
};

export default function AiChatInterface({ onClose }: AiChatInterfaceProps) {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${getTransactionApiBase()}/chat`,
    }),
  });

  const handleSuggestedPromptClick = (prompt: string) => {
    sendMessage({ text: prompt });
  };

  const handleSendMessage = (text: string) => {
    sendMessage({ text });
  };

  const isEmptyState = messages.length === 0;

  return (
    <div className="w-full h-full flex flex-col bg-sidebar text-foreground overflow-hidden">
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
          <ChatOutputArea messages={messages} status={status} />
        </div>
      </div>

      {isEmptyState && (
        <SuggestedPrompt onPromptClick={handleSuggestedPromptClick} />
      )}

      <ChatInput sendMessage={handleSendMessage} status={status} />
    </div>
  );
}
