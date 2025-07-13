import { createContext, useContext, useState, ReactNode } from "react";

interface ServiceHighlightContextType {
  transactionalEnabled: boolean;
  analyticalEnabled: boolean;
  retrievalEnabled: boolean;
  toggleTransactional: () => void;
  toggleAnalytical: () => void;
  toggleRetrieval: () => void;
}

const ServiceHighlightContext = createContext<
  ServiceHighlightContextType | undefined
>(undefined);

interface ServiceHighlightContextProviderProps {
  children: ReactNode;
}

export function ServiceHighlightContextProvider({
  children,
}: ServiceHighlightContextProviderProps) {
  const [transactionalEnabled, setTransactionalEnabled] = useState(() => {
    // Initialize from localStorage or default to false
    const saved = localStorage.getItem("service-highlight-transactional");
    return saved ? JSON.parse(saved) : false;
  });

  const [analyticalEnabled, setAnalyticalEnabled] = useState(() => {
    // Initialize from localStorage or default to false
    const saved = localStorage.getItem("service-highlight-analytical");
    return saved ? JSON.parse(saved) : false;
  });

  const [retrievalEnabled, setRetrievalEnabled] = useState(() => {
    // Initialize from localStorage or default to false
    const saved = localStorage.getItem("service-highlight-retrieval");
    return saved ? JSON.parse(saved) : false;
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
    <ServiceHighlightContext.Provider value={value}>
      {children}
    </ServiceHighlightContext.Provider>
  );
}

export function useServiceHighlight(): ServiceHighlightContextType {
  const context = useContext(ServiceHighlightContext);
  if (context === undefined) {
    throw new Error(
      "useServiceHighlight must be used within a ServiceHighlightContextProvider"
    );
  }
  return context;
}
