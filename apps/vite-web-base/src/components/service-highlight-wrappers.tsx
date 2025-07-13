import React from "react";
import { useServiceHighlight } from "../contexts/service-highlight-context";

interface ServiceHighlightWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function TransactionalWrapper({
  children,
  className = "",
}: ServiceHighlightWrapperProps) {
  const { transactionalEnabled } = useServiceHighlight();

  return (
    <div
      className={`${className} ${transactionalEnabled ? "ring-2 ring-blue-500 rounded-lg" : ""}`}
    >
      {children}
    </div>
  );
}

export function AnalyticalWrapper({
  children,
  className = "",
}: ServiceHighlightWrapperProps) {
  const { analyticalEnabled } = useServiceHighlight();

  return (
    <div
      className={`${className} ${analyticalEnabled ? "ring-2 ring-green-500 rounded-lg" : ""}`}
    >
      {children}
    </div>
  );
}
