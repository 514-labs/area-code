import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppSidebar } from "@workspace/ui/components/app-sidebar";
import { ChartAreaInteractive } from "@workspace/ui/components/chart-area-interactive";
import { DataTable } from "@workspace/ui/components/data-table";
import { SectionCards } from "@workspace/ui/components/section-cards";
import { SiteHeader } from "@workspace/ui/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { Foo } from "@workspace/models";

const API_BASE = "http://localhost:8082/api";

// API Functions
const fetchFoos = async (): Promise<Foo[]> => {
  const response = await fetch(`${API_BASE}/foo`);
  if (!response.ok) throw new Error("Failed to fetch foos");
  return response.json();
};

// Transform Foo data to match DataTable schema
const transformFoosToTableData = (foos: Foo[]) => {
  return foos.map((foo, index) => ({
    id: index + 1, // DataTable expects number id
    header: foo.name,
    type: foo.status,
    status: foo.isActive ? "Done" : "Inactive",
    target: foo.priority.toString(),
    limit: foo.priority.toString(),
    reviewer: foo.isActive ? "Eddie Lake" : "Assign reviewer",
  }));
};

function IndexPage() {
  const {
    data: foos = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["foos"],
    queryFn: fetchFoos,
  });

  const tableData = transformFoosToTableData(foos);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              {isLoading ? (
                <div className="px-4 lg:px-6">
                  <div className="flex items-center justify-center p-8">
                    <p>Loading foos...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="px-4 lg:px-6">
                  <div className="flex items-center justify-center p-8">
                    <p className="text-red-500">
                      Error loading foos: {error.message}
                    </p>
                  </div>
                </div>
              ) : (
                <DataTable data={tableData} />
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export const Route = createFileRoute("/")({
  component: IndexPage,
});
