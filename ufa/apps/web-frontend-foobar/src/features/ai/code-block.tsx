import { cn } from "@workspace/ui";

type CodeBlockProps = {
  children: string;
  language?: string;
};

export function CodeBlock({ children, language = "json" }: CodeBlockProps) {
  return (
    <pre
      className={cn(
        "mt-2 p-3 rounded-md text-xs font-mono",
        "bg-muted/50 border border-border",
        "overflow-x-auto whitespace-pre-wrap break-words"
      )}
    >
      <code>{children}</code>
    </pre>
  );
}
