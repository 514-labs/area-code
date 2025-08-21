import { cn } from "@workspace/ui";
import type { UIMessage } from "@ai-sdk/react";
import "@crayonai/react-ui/styles/index.css";
import { ToolInvocation } from "./tool-invocation";
import { ReasoningSection } from "./reasoning-section";
import { SourceSection } from "./source-section";
import { TextFormatter } from "./text-formatter";
import { ChatStatus } from "ai";
import { C1Component } from "@thesysai/genui-sdk";

type ChatOutputAreaProps = {
  messages: UIMessage[];
  status?: ChatStatus;
  className?: string;
  toolTimings?: Record<string, number>;
  isStreaming?: boolean;
};

function getTextFromParts(parts: any[]): string {
  return (
    parts
      ?.filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("") || ""
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="text-center space-y-2">
        <div className="text-muted-foreground text-sm">
          Start a conversation...
        </div>
        <div className="text-xs text-muted-foreground/70">
          Ask questions, request tool usage, or explore data
        </div>
      </div>
    </div>
  );
}

function UserOutput({ message }: { message: UIMessage }) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg text-sm leading-relaxed",
        "bg-background border border-input dark:bg-input/30",
        "text-foreground"
      )}
    >
      {message.parts && message.parts.length > 0 ? (
        message.parts.map((part: any, index: number) => {
          if (part.type === "text") {
            return (
              <div key={index} className="space-y-1">
                <TextFormatter text={part.text} />
              </div>
            );
          }
          return (
            <div key={index} className="text-muted-foreground text-xs">
              Unknown message part type: {part.type}
            </div>
          );
        })
      ) : (
        <div className="space-y-1">
          <TextFormatter text={getTextFromParts(message.parts)} />
        </div>
      )}
    </div>
  );
}

function AIOutput({
  message,
  toolTimings = {},
  isStreaming,
}: {
  message: UIMessage;
  toolTimings?: Record<string, number>;
  isStreaming?: boolean;
}) {
  const content = message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");

  return (
    <div className="space-y-3">
      {message.parts && message.parts.length > 0 ? (
        message.parts.map((part: any, index: number) => {
          switch (part.type) {
            case "text":
              return (
                <C1Component
                  c1Response={content}
                  isStreaming={isStreaming ?? false}
                />
              );

            case "reasoning":
              return <ReasoningSection key={index} part={part} />;

            case "source-url":
            case "source-document":
              return <SourceSection key={index} part={part} />;

            case "data-tool-timing":
              // Do not render anything for data-tool-timing part type since it is consumed separately
              return null;

            case "step-start":
            case "step-finish":
            case "step":
              // Handle step-related parts - these are part of multi-step workflows
              // These contain metadata like messageId, request info, usage stats, etc.
              // For now, we don't render anything for these internal step indicators
              return null;

            default:
              // Handle tool calls (tool-*)
              if (part.type.startsWith("tool-")) {
                const timing = part.toolCallId
                  ? toolTimings[part.toolCallId]
                  : undefined;
                return (
                  <ToolInvocation key={index} part={part} timing={timing} />
                );
              }

              // Fallback for unknown part types
              return (
                <div key={index} className="text-muted-foreground text-xs">
                  Unknown message part type: {part.type}
                </div>
              );
          }
        })
      ) : (
        <div className="text-sm leading-relaxed text-foreground">
          <TextFormatter text={getTextFromParts(message.parts)} />
        </div>
      )}
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center space-x-1 p-3">
      <div className="flex space-x-1">
        <div
          className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
          style={{ animationDelay: "0ms", animationDuration: "1s" }}
        ></div>
        <div
          className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
          style={{ animationDelay: "150ms", animationDuration: "1s" }}
        ></div>
        <div
          className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
          style={{ animationDelay: "300ms", animationDuration: "1s" }}
        ></div>
      </div>
    </div>
  );
}

const roleOutputMap = {
  user: UserOutput,
  assistant: AIOutput,
  system: AIOutput,
  data: AIOutput,
} as const;

export default function ChatOutputArea({
  messages,
  status,
  className,
  toolTimings = {},
}: ChatOutputAreaProps) {
  const showLoading =
    (status === "submitted" || status === "streaming") && messages.length > 0;

  return (
    <div className={cn("space-y-4 gap-4 max-w-full", className)}>
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {messages.map((message) => {
            const OutputComponent = roleOutputMap[message.role];
            return (
              <div key={message.id} className="space-y-3">
                {message.role === "user" ? (
                  <OutputComponent message={message} />
                ) : (
                  <OutputComponent
                    message={message}
                    toolTimings={toolTimings}
                    isStreaming={showLoading}
                  />
                )}
              </div>
            );
          })}
          {showLoading && <LoadingDots />}
        </>
      )}
    </div>
  );
}
