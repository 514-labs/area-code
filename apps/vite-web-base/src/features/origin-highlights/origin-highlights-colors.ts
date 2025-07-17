// Origin highlight colors for consistent usage across the application
export const ORIGIN_HIGHLIGHT_COLORS = {
  transactional: {
    ring: "ring-blue-500",
    background: "data-[state=checked]:bg-blue-500",
    border: "data-[state=checked]:border-blue-500",
    text: "data-[state=checked]:text-white",
  },
  analytical: {
    ring: "ring-green-500",
    background: "data-[state=checked]:bg-green-500",
    border: "data-[state=checked]:border-green-500",
    text: "data-[state=checked]:text-white",
  },
  retrieval: {
    ring: "ring-purple-500",
    background: "data-[state=checked]:bg-purple-500",
    border: "data-[state=checked]:border-purple-500",
    text: "data-[state=checked]:text-white",
  },
} as const;

export type OriginHighlightType = keyof typeof ORIGIN_HIGHLIGHT_COLORS;
