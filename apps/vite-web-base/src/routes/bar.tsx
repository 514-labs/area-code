import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { BarDataTable } from "../model-components/bar/bar.data-table";
import { BarCreateForm } from "../model-components/bar/bar.create";
import {
  getAnalyticalConsumptionApiBase,
  getTransactionApiBase,
} from "../env-vars";
import BarAverageValue from "@/model-components/bar/bar.average-value";
import { useCache } from "../contexts/cache-context";
import {
  TransactionalWrapper,
  AnalyticalWrapper,
} from "../components/service-highlight-wrappers";

function TransactionalBarDataTable({
  cacheEnabled,
}: {
  cacheEnabled: boolean;
}) {
  const API_BASE = getTransactionApiBase();
  const fetchApiEndpoint = `${API_BASE}/bar`;

  return (
    <BarDataTable
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

function BarManagement() {
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
            <h1 className="text-3xl font-bold">Bar Management</h1>
            <p className="text-muted-foreground">Create and manage your bars</p>
          </div>
        </div>
        <BarCreateForm />
      </div>

      <TransactionalWrapper className="col-span-12 lg:col-span-4">
        <TransactionalBarAverageValue cacheEnabled={cacheEnabled} />
      </TransactionalWrapper>

      <AnalyticalWrapper className="col-span-12 lg:col-span-4">
        <AnalyticalConsumptionBarAverageValue cacheEnabled={cacheEnabled} />
      </AnalyticalWrapper>

      <TransactionalWrapper className="col-span-12">
        <TransactionalBarDataTable cacheEnabled={cacheEnabled} />
      </TransactionalWrapper>
    </div>
  );
}

export const Route = createFileRoute("/bar")({
  component: BarManagement,
});
