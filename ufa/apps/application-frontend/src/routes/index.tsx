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
import FooTransactionalDataTable from "@/features/foo/foo.transactional.data-table";
import BarAverageValue from "@/features/bar/bar.average-value";
import BarTransactionalDataTable from "@/features/bar/bar.transactional.data-table";
import FooAnalyticalDataTable from "@/features/foo/foo.analytical.data-table";
import BarAnalyticalDataTable from "@/features/bar/bar.analytical.data-table";

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
      apiEndpoint={fetchApiEndpoint}
      disableCache={!cacheEnabled}
    />
  );
}

function IndexPage() {
  const { cacheEnabled } = useFrontendCaching();

  return (
    <div className="grid grid-cols-12 px-4 lg:px-6 gap-5 h-full overflow-auto">
      <TransactionalHighlightWrapper className="col-span-12 lg:col-span-6">
        <TransactionalFooAverageScore cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12 lg:col-span-6">
        <AnalyticalFooAverageScore cacheEnabled={cacheEnabled} />
      </AnalyticalHighlightWrapper>

      <TransactionalHighlightWrapper className="col-span-12">
        <TransactionalFooScoreOverTimeGraph cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12">
        <AnalyticalFooScoreOverTimeGraph cacheEnabled={cacheEnabled} />
      </AnalyticalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12">
        <FooAnalyticalDataTable disableCache={!cacheEnabled} />
      </AnalyticalHighlightWrapper>

      <TransactionalHighlightWrapper className="col-span-12">
        <FooTransactionalDataTable
          disableCache={!cacheEnabled}
          selectableRows={true}
        />
      </TransactionalHighlightWrapper>

      <TransactionalHighlightWrapper className="col-span-12 lg:col-span-6">
        <TransactionalBarAverageValue cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12 lg:col-span-6">
        <AnalyticalConsumptionBarAverageValue cacheEnabled={cacheEnabled} />
      </AnalyticalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12">
        <BarAnalyticalDataTable disableCache={!cacheEnabled} />
      </AnalyticalHighlightWrapper>

      <TransactionalHighlightWrapper className="col-span-12">
        <BarTransactionalDataTable
          disableCache={!cacheEnabled}
          selectableRows={true}
        />
      </TransactionalHighlightWrapper>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: IndexPage,
});
