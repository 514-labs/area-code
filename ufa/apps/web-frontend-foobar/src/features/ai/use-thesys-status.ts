import { useQuery } from "@tanstack/react-query";
import { getTransactionApiBase } from "@/env-vars";

interface ThesysStatus {
  thesysKeyAvailable: boolean;
  status: "ready" | "missing_key";
}

async function fetchThesysStatus(): Promise<ThesysStatus> {
  const response = await fetch(`${getTransactionApiBase()}/chat/status`);

  if (!response.ok) {
    throw new Error(`Failed to fetch Thesys status: ${response.statusText}`);
  }

  return response.json();
}

export function useThesysStatus() {
  return useQuery({
    queryKey: ["thesys-status"],
    queryFn: fetchThesysStatus,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache the data
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    retry: 3,
  });
}
