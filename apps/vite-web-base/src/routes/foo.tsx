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

function FooManagement() {
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
        <TransactionalFooAverageScore />
      </div>

      <div className="col-span-12 lg:col-span-4">
        <AnalyticalConsumptionFooAverageScore />
      </div>

      <div className="col-span-12">
        <AnalyticalConsumptionFooDataTable />
      </div>

      <div className="col-span-12">
        <TransactionalFooDataTable />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/foo")({
  component: FooManagement,
});
