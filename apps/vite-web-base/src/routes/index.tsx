import { createFileRoute } from "@tanstack/react-router";
import FooAverageScore from "@/model-components/foo/foo.average-score";
import { FooDataTable } from "@/model-components/foo/foo.data-table";
import {
  getAnalyticalConsumptionApiBase,
  getTransactionApiBase,
} from "@/env-vars";
import { useCache } from "../contexts/cache-context";
import {
  TransactionalWrapper,
  AnalyticalWrapper,
} from "../components/service-highlight-wrappers";

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

  return (
    <FooDataTable
      fetchApiEndpoint={fetchApiEndpoint}
      disableCache={!cacheEnabled}
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
  const { cacheEnabled } = useCache();

  return (
    <div className="grid grid-cols-12 px-4 lg:px-6 gap-5">
      <TransactionalWrapper className="col-span-12 lg:col-span-4">
        <TransactionalFooAverageScore cacheEnabled={cacheEnabled} />
      </TransactionalWrapper>

      <AnalyticalWrapper className="col-span-12 lg:col-span-4">
        <AnalyticalConsumptionFooAverageScore cacheEnabled={cacheEnabled} />
      </AnalyticalWrapper>

      <AnalyticalWrapper className="col-span-12">
        <AnalyticalConsumptionFooDataTable cacheEnabled={cacheEnabled} />
      </AnalyticalWrapper>

      <TransactionalWrapper className="col-span-12">
        <TransactionalFooDataTable cacheEnabled={cacheEnabled} />
      </TransactionalWrapper>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: IndexPage,
});
