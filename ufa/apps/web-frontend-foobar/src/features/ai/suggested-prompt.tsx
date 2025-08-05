import { cn } from "@workspace/ui";

const SUGGESTED_PROMPTS = [
  "Compute statistical analysis: rolling averages, percentiles, and standard deviations across 50,000+ foo records on both databases",
  "Perform heavy aggregation analysis: count, sum, and average foo scores grouped by month and origin across 100,000+ records on both databases",
];

type SuggestedPromptProps = {
  prompts?: string[];
  onPromptClick: (prompt: string) => void;
};

export function SuggestedPrompt({
  prompts = SUGGESTED_PROMPTS,
  onPromptClick,
}: SuggestedPromptProps) {
  return (
    <div className="flex-none px-4 pb-2">
      <div className="space-y-3">
        <div className="text-xs font-medium text-muted-foreground text-center">
          Suggested prompts:
        </div>
        <div className="grid gap-2 max-h-40 overflow-y-auto">
          {prompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => onPromptClick(prompt)}
              className={cn(
                "text-left p-3 rounded-lg border border-input/50",
                "hover:border-input hover:bg-muted/30 transition-colors",
                "text-sm text-muted-foreground hover:text-foreground",
                "cursor-pointer group"
              )}
            >
              <span className="group-hover:text-primary transition-colors">
                {prompt}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
