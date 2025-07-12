import { createFileRoute } from "@tanstack/react-router";
import FooAverageScore from "@/model-components/foo/foo.average-score";
import { FooDataTable } from "@/model-components/foo/foo.data-table";
import {
  getAnalyticalConsumptionApiBase,
  getTransactionApiBase,
} from "@/env-vars";

function TransactionalFooAverageScore() {
  const API_BASE = getTransactionApiBase();
  const apiEndpoint = `${API_BASE}/foo/average-score`;

  return <FooAverageScore apiEndpoint={apiEndpoint} />;
}

function AnalyticalConsumptionFooAverageScore() {
  const API_BASE = getAnalyticalConsumptionApiBase();
  const apiEndpoint = `${API_BASE}/foo-average-score`;

  return <FooAverageScore apiEndpoint={apiEndpoint} />;
}

function TransactionalFooDataTable() {
  const API_BASE = getTransactionApiBase();
  const fetchApiEndpoint = `${API_BASE}/foo`;

  return <FooDataTable fetchApiEndpoint={fetchApiEndpoint} />;
}

function AnalyticalConsumptionFooDataTable() {
  const API_BASE = getAnalyticalConsumptionApiBase();
  const fetchApiEndpoint = `${API_BASE}/foo`;

  return <FooDataTable fetchApiEndpoint={fetchApiEndpoint} />;
}

function IndexPage() {
  return (
    <div className="grid grid-cols-12 px-4 lg:px-6 gap-5">
      <div className="col-span-12 lg:col-span-6">
        <TransactionalFooAverageScore />
      </div>

      <div className="col-span-12 lg:col-span-6">
        <AnalyticalConsumptionFooAverageScore />
      </div>

      <div className="col-span-12 lg:col-span-6">
        <TransactionalFooDataTable />
      </div>

      <div className="col-span-12 lg:col-span-6">
        <AnalyticalConsumptionFooDataTable />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: IndexPage,
});
