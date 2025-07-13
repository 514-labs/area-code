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

function TransactionalBarDataTable() {
  const API_BASE = getTransactionApiBase();
  const fetchApiEndpoint = `${API_BASE}/bar`;

  return <BarDataTable fetchApiEndpoint={fetchApiEndpoint} />;
}

function TransactionalBarAverageValue() {
  const API_BASE = getTransactionApiBase();
  const fetchApiEndpoint = `${API_BASE}/bar/average-value`;

  return <BarAverageValue apiEndpoint={fetchApiEndpoint} />;
}

function AnalyticalConsumptionBarAverageValue() {
  const API_BASE = getAnalyticalConsumptionApiBase();
  const fetchApiEndpoint = `${API_BASE}/bar-average-value`;

  return <BarAverageValue apiEndpoint={fetchApiEndpoint} />;
}

function BarManagement() {
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

      <div className="col-span-12 lg:col-span-4">
        <TransactionalBarAverageValue />
      </div>

      <div className="col-span-12 lg:col-span-4">
        <AnalyticalConsumptionBarAverageValue />
      </div>

      <div className="col-span-12">
        <TransactionalBarDataTable />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/bar")({
  component: BarManagement,
});
