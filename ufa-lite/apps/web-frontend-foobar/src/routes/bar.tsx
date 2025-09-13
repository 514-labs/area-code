import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import BarTransactionalDataTable from "../features/bar/bar.transactional.data-table";
import { BarCreateForm } from "../features/bar/bar.create";
import { getAnalyticalApiBase, getTransactionApiBase } from "../env-vars";
import BarAverageValue from "@/features/bar/bar.average-value";
import { useFrontendCaching } from "@/features/frontend-caching/cache-context";
import {
  TransactionalHighlightWrapper,
  AnalyticalHighlightWrapper,
} from "@/features/origin-highlights/origin-highlights-wrappers";
import BarAnalyticalDataTable from "@/features/bar/bar.analytical.data-table";

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

function AnalyticalBarAverageValue({
  cacheEnabled,
}: {
  cacheEnabled: boolean;
}) {
  const API_BASE = getAnalyticalApiBase();
  const fetchApiEndpoint = `${API_BASE}/bar-average-value`;

  return (
    <BarAverageValue
      title="Bar Average Value"
      description="Analytical"
      apiEndpoint={fetchApiEndpoint}
      disableCache={!cacheEnabled}
    />
  );
}

function BarPage() {
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

      <TransactionalHighlightWrapper className="col-span-12 lg:col-span-6">
        <TransactionalBarAverageValue cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12 lg:col-span-6">
        <AnalyticalBarAverageValue cacheEnabled={cacheEnabled} />
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

export const Route = createFileRoute("/bar")({
  component: BarPage,
});
