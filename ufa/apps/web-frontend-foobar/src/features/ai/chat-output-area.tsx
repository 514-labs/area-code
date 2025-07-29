import { cn } from "@workspace/ui";
import type { UIMessage } from "@ai-sdk/react";
import { ToolInvocation } from "./tool-invocation";
import { ReasoningSection } from "./reasoning-section";
import { SourceSection } from "./source-section";
import { TextFormatter } from "./text-formatter";

type ChatOutputAreaProps = {
  messages: UIMessage[];
  className?: string;
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
        "bg-background border border-input",
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

function AIOutput({ message }: { message: UIMessage }) {
  return (
    <div className="space-y-3">
      {message.parts && message.parts.length > 0 ? (
        message.parts.map((part: any, index: number) => {
          switch (part.type) {
            case "text":
              return (
                <div
                  key={index}
                  className="text-sm leading-relaxed text-foreground"
                >
                  <TextFormatter text={part.text} />
                </div>
              );

            case "reasoning":
              return <ReasoningSection key={index} part={part} />;

            case "source-url":
            case "source-document":
              return <SourceSection key={index} part={part} />;

            default:
              // Handle tool calls (tool-*)
              if (part.type.startsWith("tool-")) {
                return <ToolInvocation key={index} part={part} />;
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

const roleOutputMap = {
  user: UserOutput,
  assistant: AIOutput,
  system: AIOutput,
  data: AIOutput,
} as const;

export default function ChatOutputArea({
  messages,
  className,
}: ChatOutputAreaProps) {
  return (
    <div className={cn("space-y-4 gap-4 max-w-full", className)}>
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        messages.map((message) => {
          const OutputComponent = roleOutputMap[message.role];
          return (
            <div key={message.id} className="space-y-3">
              <OutputComponent message={message} />
            </div>
          );
        })
      )}
    </div>
  );
}
