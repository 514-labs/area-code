import { createFileRoute } from "@tanstack/react-router";
import { FooDataTable } from "@/model-components/foo/foo.data-table";

function IndexPage() {
  return (
    <>
      {/* <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div> */}
      <div className="px-4 lg:px-6">
        <FooDataTable />
      </div>
    </>
  );
}

export const Route = createFileRoute("/")({
  component: IndexPage,
});
