import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { BarDataTable } from "../features/bar/bar.data-table";
import { BarCreateForm } from "../features/bar/bar.create";
import {
  getAnalyticalConsumptionApiBase,
  getTransactionApiBase,
} from "../env-vars";
import BarAverageValue from "@/features/bar/bar.average-value";
import { useFrontendCaching } from "@/features/frontend-caching/cache-context";
import {
  TransactionalHighlightWrapper,
  AnalyticalHighlightWrapper,
} from "@/features/origin-highlights/origin-highlights-wrappers";

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
  const { cacheEnabled } = useFrontendCaching();

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

      <TransactionalHighlightWrapper className="col-span-12 lg:col-span-4">
        <TransactionalBarAverageValue cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12 lg:col-span-4">
        <AnalyticalConsumptionBarAverageValue cacheEnabled={cacheEnabled} />
      </AnalyticalHighlightWrapper>

      <TransactionalHighlightWrapper className="col-span-12 lg:col-span-8">
        <TransactionalBarDataTable cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>
    </div>
  );
}

export const Route = createFileRoute("/bar")({
  component: BarManagement,
});
