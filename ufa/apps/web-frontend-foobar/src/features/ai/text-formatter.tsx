type TextFormatterProps = {
  text: string;
};

export function TextFormatter({ text }: TextFormatterProps) {
  // Simple inline code handling - much simpler than the monster function before
  const parts = text.split(/(`[^`]+`)/);

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          // Remove the backticks and render as inline code
          const code = part.slice(1, -1);
          return (
            <code
              key={index}
              className="px-1 py-0.5 mx-0.5 text-xs font-mono bg-muted rounded"
            >
              {code}
            </code>
          );
        }
        return part;
      })}
    </span>
  );
}
