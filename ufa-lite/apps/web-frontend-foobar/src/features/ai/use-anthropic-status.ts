import { useQuery } from "@tanstack/react-query";
import { getTransactionApiBase } from "@/env-vars";

interface AnthropicStatus {
  anthropicKeyAvailable: boolean;
  status: "ready" | "missing_key";
}

async function fetchAnthropicStatus(): Promise<AnthropicStatus> {
  const response = await fetch(`${getTransactionApiBase()}/chat/status`);

  if (!response.ok) {
    throw new Error(`Failed to fetch Anthropic status: ${response.statusText}`);
  }

  return response.json();
}

export function useAnthropicStatus() {
  return useQuery({
    queryKey: ["anthropic-status"],
    queryFn: fetchAnthropicStatus,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache the data
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    retry: 3,
  });
}
