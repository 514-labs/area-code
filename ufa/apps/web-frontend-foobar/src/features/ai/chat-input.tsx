"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button, Textarea, cn } from "@workspace/ui";
import { ChatStatus } from "ai";

type ChatInputProps = {
  sendMessage: (text: string) => void;
  status: ChatStatus;
};

export default function ChatInput({ sendMessage, status }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (inputValue: string) => {
    sendMessage(inputValue);
    setInput("");
  };

  return (
    <div className="flex-none py-2 pl-1.5 pr-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            handleSubmit(input);
          }
        }}
        className="w-full space-y-1"
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
                handleSubmit(input);
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
  );
}
