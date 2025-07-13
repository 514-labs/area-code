import { createContext, useContext, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface CacheContextType {
  cacheEnabled: boolean;
  toggleCache: () => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

interface CacheContextProviderProps {
  children: ReactNode;
}

export function CacheContextProvider({ children }: CacheContextProviderProps) {
  const queryClient = useQueryClient();

  const [cacheEnabled, setCacheEnabled] = useState(() => {
    // Initialize from localStorage or default to true
    const saved = localStorage.getItem("cache-enabled");
    return saved ? JSON.parse(saved) : true;
  });

  const toggleCache = () => {
    const newCacheState = !cacheEnabled;
    setCacheEnabled(newCacheState);
    localStorage.setItem("cache-enabled", JSON.stringify(newCacheState));

    // Clear React Query cache when disabling cache
    if (!newCacheState) {
      queryClient.clear();

      // Alternative: More targeted cache clearing
      // queryClient.removeQueries({ queryKey: ["foos"] });
      // queryClient.removeQueries({ queryKey: ["foo-average-score"] });
      // queryClient.removeQueries({ queryKey: ["bars"] });
      // queryClient.removeQueries({ queryKey: ["bar-average-value"] });
    }
  };

  const value = {
    cacheEnabled,
    toggleCache,
  };

  return (
    <CacheContext.Provider value={value}>{children}</CacheContext.Provider>
  );
}

export function useCache(): CacheContextType {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error("useCache must be used within a CacheContextProvider");
  }
  return context;
}
