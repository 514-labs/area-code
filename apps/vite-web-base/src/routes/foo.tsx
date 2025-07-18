import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import FooTransactionalDataTable from "../features/foo/foo.transactional.data-table";
import FooAnalyticalDataTable from "../features/foo/foo.analytical.data-table";
import { FooCreateForm } from "../features/foo/foo.create";
import {
  getAnalyticalConsumptionApiBase,
  getTransactionApiBase,
} from "../env-vars";
import FooAverageScore from "@/features/foo/foo.average-score";
import { useFrontendCaching } from "@/features/frontend-caching/cache-context";
import {
  TransactionalHighlightWrapper,
  AnalyticalHighlightWrapper,
} from "@/features/origin-highlights/origin-highlights-wrappers";

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

function FooPage() {
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
            <h1 className="text-3xl font-bold">Foo Management</h1>
            <p className="text-muted-foreground">Create and manage your foos</p>
          </div>
        </div>
        <FooCreateForm />
      </div>

      <TransactionalHighlightWrapper className="col-span-12 lg:col-span-6">
        <TransactionalFooAverageScore cacheEnabled={cacheEnabled} />
      </TransactionalHighlightWrapper>

      <AnalyticalHighlightWrapper className="col-span-12 lg:col-span-6">
        <AnalyticalConsumptionFooAverageScore cacheEnabled={cacheEnabled} />
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
    </div>
  );
}

export const Route = createFileRoute("/foo")({
  component: FooPage,
});
