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
import { FooDataTable } from "@/features/foo/foo.data-table";
import BarAverageValue from "@/features/bar/bar.average-value";
import { BarDataTable } from "@/features/bar/bar.data-table";
import { FooCDCDataTable } from "@/features/foo/foo.cdc-data-table";
import { BarCDCDataTable } from "@/features/bar/bar.cdc-data-table";

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

function TransactionalFooDataTable({
  cacheEnabled,
}: {
  cacheEnabled: boolean;
}) {
  const API_BASE = getTransactionApiBase();
  const fetchApiEndpoint = `${API_BASE}/foo`;
  const deleteApiEndpoint = `${API_BASE}/foo`;
  const editApiEndpoint = `${API_BASE}/foo`;

  return (
    <FooDataTable
      fetchApiEndpoint={fetchApiEndpoint}
      disableCache={!cacheEnabled}
      selectableRows={true}
      deleteApiEndpoint={deleteApiEndpoint}
      editApiEndpoint={editApiEndpoint}
    />
  );
}

function AnalyticalConsumptionFooDataTable({
  cacheEnabled,
}: {
  cacheEnabled: boolean;
}) {
  const API_BASE = getAnalyticalConsumptionApiBase();
  const fetchApiEndpoint = `${API_BASE}/foo`;

  return (
    <FooCDCDataTable
      fetchApiEndpoint={fetchApiEndpoint}
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

function TransactionalBarDataTable({
  cacheEnabled,
}: {
  cacheEnabled: boolean;
}) {
  const API_BASE = getTransactionApiBase();
  const fetchApiEndpoint = `${API_BASE}/bar`;
  const deleteApiEndpoint = `${API_BASE}/bar`;
  const editApiEndpoint = `${API_BASE}/bar`;

  return (
    <BarDataTable
      fetchApiEndpoint={fetchApiEndpoint}
      disableCache={!cacheEnabled}
      selectableRows={true}
      deleteApiEndpoint={deleteApiEndpoint}
      editApiEndpoint={editApiEndpoint}
    />
  );
}

function AnalyticalBarCDCDataTable({
  cacheEnabled,
}: {
  cacheEnabled: boolean;
}) {
  const API_BASE = getAnalyticalConsumptionApiBase();
  const fetchApiEndpoint = `${API_BASE}/bar`;

  return (
    <BarCDCDataTable
      fetchApiEndpoint={fetchApiEndpoint}
      disableCache={!cacheEnabled}
    />
  );
}

function IndexPage() {
  const { cacheEnabled } = useFrontendCaching();

  return (
    <div className="grid grid-cols-12 px-4 lg:px-6 gap-5">
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
        <AnalyticalConsumptionFooDataTable cacheEnabled={cacheEnabled} />
      </AnalyticalHighlightWrapper>

      <TransactionalHighlightWrapper className="col-span-12">
        <TransactionalFooDataTable cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>

      <TransactionalHighlightWrapper className="col-span-12 lg:col-span-6">
        <TransactionalBarAverageValue cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12 lg:col-span-6">
        <AnalyticalConsumptionBarAverageValue cacheEnabled={cacheEnabled} />
      </AnalyticalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12">
        <AnalyticalBarCDCDataTable cacheEnabled={cacheEnabled} />
      </AnalyticalHighlightWrapper>

      <TransactionalHighlightWrapper className="col-span-12">
        <TransactionalBarDataTable cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: IndexPage,
});
