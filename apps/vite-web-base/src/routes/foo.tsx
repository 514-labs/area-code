import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { FooDataTable } from "../model-components/foo/foo.data-table";
import { FooCreateForm } from "../model-components/foo/foo.create";
import {
  getAnalyticalConsumptionApiBase,
  getTransactionApiBase,
} from "../env-vars";
import FooAverageScore from "@/model-components/foo/foo.average-score";
import { useCache } from "../contexts/cache-context";

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

function FooManagement() {
  const { cacheEnabled } = useCache();

  return (
    <div className="grid grid-cols-12 px-4 lg:px-6 gap-5">
      {/* Header */}
      <div className="flex items-center justify-between col-span-12">
        <div className="flex items-center space-x-4">
          <Link to="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Foo Management</h1>
            <p className="text-muted-foreground">Create and manage your foos</p>
          </div>
        </div>
        <FooCreateForm />
      </div>

      <div className="col-span-12 lg:col-span-4">
        <TransactionalFooAverageScore cacheEnabled={cacheEnabled} />
      </div>

      <div className="col-span-12 lg:col-span-4">
        <AnalyticalConsumptionFooAverageScore cacheEnabled={cacheEnabled} />
      </div>

      <div className="col-span-12">
        <AnalyticalConsumptionFooDataTable cacheEnabled={cacheEnabled} />
      </div>

      <div className="col-span-12">
        <TransactionalFooDataTable cacheEnabled={cacheEnabled} />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/foo")({
  component: FooManagement,
});
