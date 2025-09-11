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
import BarAverageValue from "@/features/bar/bar.average-value";
import { FooCubeAggregationsTable } from "@/features/foo/foo.cube-aggregations.table";

function TransactionalFooAverageScore({
  cacheEnabled,
}: {
  cacheEnabled: boolean;
}) {
  const API_BASE = getTransactionApiBase();
  const apiEndpoint = `${API_BASE}/foo/average-score`;

  return (
    <FooAverageScore
      title="Foo Average Score"
      description="Transactional"
      apiEndpoint={apiEndpoint}
      disableCache={!cacheEnabled}
    />
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
    <FooAverageScore
      title="Foo Average Score"
      description="Foo Current State Materialized View"
      apiEndpoint={apiEndpoint}
      disableCache={!cacheEnabled}
    />
  );
}

function AnalyticalFooScoreOverTimeGraph({
  cacheEnabled,
}: {
  cacheEnabled: boolean;
}) {
  const API_BASE = getAnalyticalConsumptionApiBase();
  const apiEndpoint = `${API_BASE}/foo-score-over-time`;

  return (
    <FooScoreOverTimeGraph
      fetchApiEndpoint={apiEndpoint}
      disableCache={!cacheEnabled}
    />
  );
}

function TransactionalFooScoreOverTimeGraph({
  cacheEnabled,
}: {
  cacheEnabled: boolean;
}) {
  const API_BASE = getTransactionApiBase();
  const apiEndpoint = `${API_BASE}/foo/score-over-time`;

  return (
    <FooScoreOverTimeGraph
      fetchApiEndpoint={apiEndpoint}
      disableCache={!cacheEnabled}
    />
  );
}

function TransactionalBarAverageValue({
  cacheEnabled,
}: {
  cacheEnabled: boolean;
}) {
  const API_BASE = getTransactionApiBase();
  const fetchApiEndpoint = `${API_BASE}/bar/average-value`;

  return (
    <BarAverageValue
      title="Bar Average Value"
      description="Transactional"
      apiEndpoint={fetchApiEndpoint}
      disableCache={!cacheEnabled}
    />
  );
}

function AnalyticalConsumptionBarAverageValue({
  cacheEnabled,
}: {
  cacheEnabled: boolean;
}) {
  const API_BASE = getAnalyticalConsumptionApiBase();
  const fetchApiEndpoint = `${API_BASE}/bar-average-value`;

  return (
    <BarAverageValue
      title="Bar Average Value"
      description="CDC Analytical"
      apiEndpoint={fetchApiEndpoint}
      disableCache={!cacheEnabled}
    />
  );
}

function IndexPage() {
  const { cacheEnabled } = useFrontendCaching();

  return (
    <div className="grid grid-cols-12 px-4 lg:px-6 gap-5 h-full overflow-auto pt-0.5">
      <TransactionalHighlightWrapper className="col-span-12">
        <TransactionalFooScoreOverTimeGraph cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12">
        <AnalyticalFooScoreOverTimeGraph cacheEnabled={cacheEnabled} />
      </AnalyticalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12">
        <FooCubeAggregationsTable
          disableCache={!cacheEnabled}
          apiUrl={`${getAnalyticalConsumptionApiBase()}/foo-cube-aggregations`}
          title="Analytical Cube Aggregations"
          subtitle="Month × Status × Tag × Priority with percentiles"
        />
      </AnalyticalHighlightWrapper>

      <TransactionalHighlightWrapper className="col-span-12">
        <FooCubeAggregationsTable
          disableCache={!cacheEnabled}
          apiUrl={`${getTransactionApiBase()}/foo/cube-aggregations`}
          title="Transactional Cube Aggregations"
          subtitle="Month × Status × Tag × Priority with percentiles"
        />
      </TransactionalHighlightWrapper>

      <TransactionalHighlightWrapper className="col-span-12">
        <TransactionalFooAverageScore cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>

      <TransactionalHighlightWrapper className="col-span-12 lg:col-span-6">
        <TransactionalBarAverageValue cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12 lg:col-span-6">
        <AnalyticalConsumptionBarAverageValue cacheEnabled={cacheEnabled} />
      </AnalyticalHighlightWrapper>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: IndexPage,
});
