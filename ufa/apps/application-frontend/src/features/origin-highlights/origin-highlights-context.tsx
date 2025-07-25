import { createContext, useContext, useState, ReactNode } from "react";

type OriginHighlightsContextType = {
  transactionalEnabled: boolean;
  analyticalEnabled: boolean;
  retrievalEnabled: boolean;
  toggleTransactional: () => void;
  toggleAnalytical: () => void;
  toggleRetrieval: () => void;
};

const OriginHighlightsContext = createContext<
  OriginHighlightsContextType | undefined
>(undefined);

interface OriginHighlightsContextProviderProps {
  children: ReactNode;
}

export function OriginHighlightsContextProvider({
  children,
}: OriginHighlightsContextProviderProps) {
  const [transactionalEnabled, setTransactionalEnabled] = useState(() => {
    // Initialize from localStorage or default to false
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("service-highlight-transactional");
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const [analyticalEnabled, setAnalyticalEnabled] = useState(() => {
    // Initialize from localStorage or default to false
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("service-highlight-analytical");
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const [retrievalEnabled, setRetrievalEnabled] = useState(() => {
    // Initialize from localStorage or default to false
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("service-highlight-retrieval");
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const toggleTransactional = () => {
    const newState = !transactionalEnabled;
    setTransactionalEnabled(newState);
    localStorage.setItem(
      "service-highlight-transactional",
      JSON.stringify(newState)
    );
  };

  const toggleAnalytical = () => {
    const newState = !analyticalEnabled;
    setAnalyticalEnabled(newState);
    localStorage.setItem(
      "service-highlight-analytical",
      JSON.stringify(newState)
    );
  };

  const toggleRetrieval = () => {
    const newState = !retrievalEnabled;
    setRetrievalEnabled(newState);
    localStorage.setItem(
      "service-highlight-retrieval",
      JSON.stringify(newState)
    );
  };

  const value = {
    transactionalEnabled,
    analyticalEnabled,
    retrievalEnabled,
    toggleTransactional,
    toggleAnalytical,
    toggleRetrieval,
  };

  return (
    <OriginHighlightsContext.Provider value={value}>
      {children}
    </OriginHighlightsContext.Provider>
  );
}

export function useOriginHighlights(): OriginHighlightsContextType {
  const context = useContext(OriginHighlightsContext);
  if (context === undefined) {
    throw new Error(
      "useServiceHighlight must be used within a ServiceHighlightContextProvider"
    );
  }
  return context;
}
