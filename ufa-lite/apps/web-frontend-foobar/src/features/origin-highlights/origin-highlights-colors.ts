// Origin highlight colors for consistent usage across the application
export const ORIGIN_HIGHLIGHT_COLORS = {
  transactional: {
    ring: "ring-blue-500 dark:ring-blue-400",
    background:
      "data-[state=checked]:bg-blue-500 dark:data-[state=checked]:bg-blue-600",
    border:
      "data-[state=checked]:border-blue-500 dark:data-[state=checked]:border-blue-400",
    text: "data-[state=checked]:text-white dark:data-[state=checked]:text-blue-50",
  },
  analytical: {
    ring: "ring-green-500 dark:ring-green-400",
    background:
      "data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600",
    border:
      "data-[state=checked]:border-green-500 dark:data-[state=checked]:border-green-400",
    text: "data-[state=checked]:text-white dark:data-[state=checked]:text-green-50",
  },
  retrieval: {
    ring: "ring-purple-500 dark:ring-purple-400",
    background:
      "data-[state=checked]:bg-purple-500 dark:data-[state=checked]:bg-purple-600",
    border:
      "data-[state=checked]:border-purple-500 dark:data-[state=checked]:border-purple-400",
    text: "data-[state=checked]:text-white dark:data-[state=checked]:text-purple-50",
  },
} as const;

export type OriginHighlightType = keyof typeof ORIGIN_HIGHLIGHT_COLORS;
