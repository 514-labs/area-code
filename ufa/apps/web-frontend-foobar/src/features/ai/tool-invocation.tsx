import { cn, Badge } from "@workspace/ui";
import { CheckCircle, AlertCircle, Wrench, Loader2 } from "lucide-react";
import { CodeBlock } from "./code-block";

type ToolInvocationProps = {
  part: any; // Tool call part from AI SDK
};

export function ToolInvocation({ part }: ToolInvocationProps) {
  return (
    <div
      className={cn(
        "mt-2 p-3 rounded-lg border",
        "bg-blue-50/50 border-blue-200/50 dark:bg-blue-950/20 dark:border-blue-800/30"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <Badge variant="secondary" className="text-xs">
          Tool Call
        </Badge>
        {part.state === "input-streaming" && (
          <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
        )}
      </div>

      <div className="text-sm text-muted-foreground mb-1">Tool Call ID:</div>
      <code className="text-xs bg-muted px-2 py-1 rounded">
        {part.toolCallId}
      </code>

      {part.input && (
        <>
          <div className="text-sm text-muted-foreground mb-1 mt-3">Input:</div>
          <CodeBlock>{JSON.stringify(part.input, null, 2)}</CodeBlock>
        </>
      )}

      {part.output && (
        <>
          <div className="flex items-center gap-2 mt-3 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-muted-foreground">Output:</span>
          </div>
          <CodeBlock>
            {typeof part.output === "string"
              ? part.output
              : JSON.stringify(part.output, null, 2)}
          </CodeBlock>
        </>
      )}

      {part.errorText && (
        <>
          <div className="flex items-center gap-2 mt-3 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">
              Error:
            </span>
          </div>
          <div className="text-sm text-red-700 dark:text-red-300 bg-red-50/50 dark:bg-red-950/20 p-2 rounded">
            {part.errorText}
          </div>
        </>
      )}
    </div>
  );
}
