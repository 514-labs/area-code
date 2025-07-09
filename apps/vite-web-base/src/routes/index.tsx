import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppSidebar } from "@workspace/ui/components/app-sidebar";
import { SiteHeader } from "@workspace/ui/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { Foo } from "@workspace/models";
import { FooDataTable } from "@/model-components/foo/foo.data-table";

const API_BASE = "http://localhost:8082/api";

// API Response Types
interface FooResponse {
  data: Foo[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// API Functions
const fetchFoos = async (
  limit: number = 10,
  offset: number = 0
): Promise<FooResponse> => {
  const response = await fetch(
    `${API_BASE}/foo?limit=${limit}&offset=${offset}`
  );
  if (!response.ok) throw new Error("Failed to fetch foos");
  return response.json();
};

function IndexPage() {
  const {
    data: fooResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["foos"],
    queryFn: () => fetchFoos(10, 0),
  });

  const foos = fooResponse?.data || [];
  const pagination = fooResponse?.pagination;

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
              {/* <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div> */}
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
                <div className="px-4 lg:px-6">
                  {pagination && (
                    <div className="mb-4 text-sm text-gray-600">
                      Showing {pagination.offset + 1} to{" "}
                      {Math.min(
                        pagination.offset + pagination.limit,
                        pagination.total
                      )}{" "}
                      of {pagination.total} items
                      {pagination.hasMore && " (more available)"}
                    </div>
                  )}
                  <FooDataTable data={foos} />
                </div>
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
