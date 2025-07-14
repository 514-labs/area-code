import React from "react";
import { useOriginHighlights } from "./origin-highlights-context";

interface OriginHighlightsWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function TransactionalHighlightWrapper({
  children,
  className = "",
}: OriginHighlightsWrapperProps) {
  const { transactionalEnabled } = useOriginHighlights();

  return (
    <div
      className={`${className} ${transactionalEnabled ? "ring-2 ring-blue-500 rounded-lg" : ""}`}
    >
      {children}
    </div>
  );
}

export function AnalyticalHighlightWrapper({
  children,
  className = "",
}: OriginHighlightsWrapperProps) {
  const { analyticalEnabled } = useOriginHighlights();

  return (
    <div
      className={`${className} ${analyticalEnabled ? "ring-2 ring-green-500 rounded-lg" : ""}`}
    >
      {children}
    </div>
  );
}

export function RetrievalHighlightWrapper({
  children,
  className = "",
}: OriginHighlightsWrapperProps) {
  const { retrievalEnabled } = useOriginHighlights();

  return (
    <div
      className={`${className} ${retrievalEnabled ? "ring-2 ring-purple-500 rounded-lg" : ""}`}
    >
      {children}
    </div>
  );
}
