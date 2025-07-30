import { createContext, useContext, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

type FrontendCachingContextType = {
  cacheEnabled: boolean;
  toggleCache: () => void;
};

const FrontendCachingContext = createContext<
  FrontendCachingContextType | undefined
>(undefined);

interface FrontendCachingContextProviderProps {
  children: ReactNode;
}

export function FrontendCachingContextProvider({
  children,
}: FrontendCachingContextProviderProps) {
  const queryClient = useQueryClient();

  const [cacheEnabled, setCacheEnabled] = useState(() => {
    // Initialize from localStorage or default to false
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cache-enabled");
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const toggleCache = () => {
    const newCacheState = !cacheEnabled;
    setCacheEnabled(newCacheState);
    localStorage.setItem("cache-enabled", JSON.stringify(newCacheState));

    // Clear React Query cache when disabling cache
    if (!newCacheState) {
      queryClient.clear();
    }
  };

  const value = {
    cacheEnabled,
    toggleCache,
  };

  return (
    <FrontendCachingContext.Provider value={value}>
      {children}
    </FrontendCachingContext.Provider>
  );
}

export function useFrontendCaching(): FrontendCachingContextType {
  const context = useContext(FrontendCachingContext);
  if (context === undefined) {
    throw new Error(
      "useFrontendCaching must be used within a FrontendCachingContextProvider"
    );
  }
  return context;
}
