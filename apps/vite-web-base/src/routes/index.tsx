import { createFileRoute } from "@tanstack/react-router";
import FooAverageScore from "@/features/foo/foo.average-score";
import { FooDataTable } from "@/features/foo/foo.data-table";
import {
  getAnalyticalConsumptionApiBase,
  getTransactionApiBase,
} from "@/env-vars";
import { useFrontendCaching } from "../features/frontend-caching/cache-context";
import {
  TransactionalHighlightWrapper,
  AnalyticalHighlightWrapper,
} from "../features/origin-highlights/origin-highlights-wrappers";

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

function AnalyticalConsumptionFooAverageScore({
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

function TransactionalFooDataTable({
  cacheEnabled,
}: {
  cacheEnabled: boolean;
}) {
  const API_BASE = getTransactionApiBase();
  const fetchApiEndpoint = `${API_BASE}/foo`;
  const editApiEndpoint = `${API_BASE}/foo`;

  return (
    <FooDataTable
      fetchApiEndpoint={fetchApiEndpoint}
      disableCache={!cacheEnabled}
      selectableRows={true}
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
    <FooDataTable
      fetchApiEndpoint={fetchApiEndpoint}
      disableCache={!cacheEnabled}
    />
  );
}

function IndexPage() {
  const { cacheEnabled } = useFrontendCaching();

  return (
    <div className="grid grid-cols-12 px-4 lg:px-6 gap-5">
      <TransactionalHighlightWrapper className="col-span-12 lg:col-span-4">
        <TransactionalFooAverageScore cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12 lg:col-span-4">
        <AnalyticalConsumptionFooAverageScore cacheEnabled={cacheEnabled} />
      </AnalyticalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12">
        <AnalyticalConsumptionFooDataTable cacheEnabled={cacheEnabled} />
      </AnalyticalHighlightWrapper>

      <TransactionalHighlightWrapper className="col-span-12">
        <TransactionalFooDataTable cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: IndexPage,
});
