import React from "react";
import { useOriginHighlights } from "./origin-highlights-context";
import { ORIGIN_HIGHLIGHT_COLORS } from "./origin-highlights-colors";

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
      className={`h-full ${className} ${transactionalEnabled ? `ring-2 ${ORIGIN_HIGHLIGHT_COLORS.transactional.ring} rounded-xl` : ""}`}
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
      className={`h-full ${className} ${analyticalEnabled ? `ring-2 ${ORIGIN_HIGHLIGHT_COLORS.analytical.ring} rounded-xl` : ""}`}
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
      className={`${className} ${retrievalEnabled ? `ring-2 ${ORIGIN_HIGHLIGHT_COLORS.retrieval.ring} rounded-lg` : ""}`}
    >
      {children}
    </div>
  );
}
