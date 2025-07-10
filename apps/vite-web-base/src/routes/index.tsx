import { createFileRoute } from "@tanstack/react-router";
import { FooAverageScore } from "@/model-components/foo/foo.average-score";
import { FooDataTable } from "@/model-components/foo/foo.data-table";

function IndexPage() {
  return (
    <div className="grid grid-cols-12 px-4 lg:px-6 gap-5">
      <div className="col-span-12 lg:col-span-4">
        <FooAverageScore />
      </div>
      <div className="col-span-12 lg:col-span-12">
        <FooDataTable />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: IndexPage,
});
