import { createFileRoute } from "@tanstack/react-router";
import FooAverageScore from "@/features/foo/foo.average-score";
import {
  getAnalyticalConsumptionApiBase,
  getTransactionApiBase,
} from "@/env-vars";
import { useFrontendCaching } from "../features/frontend-caching/cache-context";
import {
  TransactionalHighlightWrapper,
  AnalyticalHighlightWrapper,
} from "../features/origin-highlights/origin-highlights-wrappers";
import { FooScoreOverTimeGraph } from "@/features/foo/foo.score-over-time.graph";

function TransactionalFooAverageScore({
  cacheEnabled,
}: {
  cacheEnabled: boolean;
}) {
  const API_BASE = getTransactionApiBase();
  const apiEndpoint = `${API_BASE}/foo/average-score`;

  return (
    <FooAverageScore apiEndpoint={apiEndpoint} disableCache={!cacheEnabled} />
  );
}

function AnalyticalFooAverageScore({
  cacheEnabled,
}: {
  cacheEnabled: boolean;
}) {
  const API_BASE = getAnalyticalConsumptionApiBase();
  const apiEndpoint = `${API_BASE}/foo-average-score`;

  return (
    <FooAverageScore apiEndpoint={apiEndpoint} disableCache={!cacheEnabled} />
  );
}

function AnalyticalFooScoreOverTimeGraph() {
  const API_BASE = getAnalyticalConsumptionApiBase();
  const apiEndpoint = `${API_BASE}/foo-score-over-time`;

  return <FooScoreOverTimeGraph fetchApiEndpoint={apiEndpoint} />;
}

function TransactionalFooScoreOverTimeGraph() {
  const API_BASE = getTransactionApiBase();
  const apiEndpoint = `${API_BASE}/foo/score-over-time`;

  return <FooScoreOverTimeGraph fetchApiEndpoint={apiEndpoint} />;
}

function IndexPage() {
  const { cacheEnabled } = useFrontendCaching();

  return (
    <div className="grid grid-cols-12 px-4 lg:px-6 gap-5">
      <TransactionalHighlightWrapper className="col-span-12 lg:col-span-4">
        <TransactionalFooAverageScore cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12 lg:col-span-4">
        <AnalyticalFooAverageScore cacheEnabled={cacheEnabled} />
      </AnalyticalHighlightWrapper>

      <TransactionalHighlightWrapper className="col-span-12">
        <TransactionalFooScoreOverTimeGraph />
      </TransactionalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12">
        <AnalyticalFooScoreOverTimeGraph />
      </AnalyticalHighlightWrapper>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: IndexPage,
});
