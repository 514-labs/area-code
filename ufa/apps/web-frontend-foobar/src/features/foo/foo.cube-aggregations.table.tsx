"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { NumericFormat } from "react-number-format";
import { format, parseISO } from "date-fns";
import {
  GetFooCubeAggregationsParams,
  GetFooCubeAggregationsResponse,
  GetFooFiltersValuesParams,
  GetFooFiltersValuesResponse,
} from "@workspace/models/foo";
import { getAnalyticalConsumptionApiBase } from "@/env-vars";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Column,
} from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLoader,
} from "@tabler/icons-react";
import { Card, CardContent } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

const fetchData = async (
  params: GetFooCubeAggregationsParams,
  apiUrl: string
): Promise<GetFooCubeAggregationsResponse> => {
  const query = new URLSearchParams();
  if (params.months != null) query.set("months", String(params.months));
  if (params.status) query.set("status", params.status);
  if (params.tag) query.set("tag", params.tag);
  if (params.priority != null) query.set("priority", String(params.priority));
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  const res = await fetch(`${apiUrl}?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch cube data");
  return res.json();
};

const fetchFilterValues = async (
  params: GetFooFiltersValuesParams
): Promise<GetFooFiltersValuesResponse> => {
  const apiEndpoint = `${getAnalyticalConsumptionApiBase()}/foo-filters-values`;
  const query = new URLSearchParams();
  if (params.months) query.set("months", String(params.months));
  const res = await fetch(`${apiEndpoint}?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch filter values");
  return res.json();
};

type CubeRow = GetFooCubeAggregationsResponse["data"][number];

const SortableHeader = ({
  column,
  children,
  className,
}: {
  column: Column<CubeRow, unknown>;
  children: React.ReactNode;
  className?: string;
}) => {
  if (!column.getCanSort()) {
    return <div>{children}</div>;
  }
  const currentSort = column.getIsSorted();
  const icon =
    currentSort === "desc" ? (
      <IconArrowDown className="ml-2 h-4 w-4" />
    ) : currentSort === "asc" ? (
      <IconArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <IconArrowsSort className="ml-2 h-4 w-4" />
    );

  return (
    <div
      onClick={() => column.toggleSorting(currentSort === "asc")}
      className={cn(
        "flex h-full items-center px-0 w-full cursor-pointer",
        className
      )}
    >
      <span>{children}</span>
      {icon}
    </div>
  );
};

const columnDefs: ColumnDef<CubeRow>[] = [
  {
    accessorKey: "month",
    header: ({ column }) => (
      <SortableHeader column={column} className="pl-2">
        Month
      </SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="pl-2">
        {row.original.month
          ? format(parseISO(row.original.month), "MMM yyyy")
          : "ALL"}
      </span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <SortableHeader column={column}>Status</SortableHeader>
    ),
    cell: ({ row }) => <span>{row.original.status ?? "ALL"}</span>,
    enableSorting: true,
  },
  {
    accessorKey: "tag",
    header: ({ column }) => (
      <SortableHeader column={column}>Tag</SortableHeader>
    ),
    cell: ({ row }) => <span>{row.original.tag ?? "ALL"}</span>,
    enableSorting: true,
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <SortableHeader column={column}>Priority</SortableHeader>
    ),
    cell: ({ row }) => <span>{row.original.priority ?? "ALL"}</span>,
    enableSorting: true,
  },
  {
    accessorKey: "n",
    header: ({ column }) => (
      <SortableHeader column={column} className="justify-end">
        Count
      </SortableHeader>
    ),
    cell: ({ row }) => (
      <div className="text-right">{row.original.n.toLocaleString()}</div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "avgScore",
    header: ({ column }) => (
      <SortableHeader column={column} className="justify-end">
        Avg Score
      </SortableHeader>
    ),
    cell: ({ row }) => (
      <div className="text-right">{row.original.avgScore.toFixed(2)}</div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "p50",
    header: ({ column }) => (
      <SortableHeader column={column} className="justify-end">
        P50
      </SortableHeader>
    ),
    cell: ({ row }) => (
      <div className="text-right">{row.original.p50.toFixed(2)}</div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "p90",
    header: ({ column }) => (
      <SortableHeader column={column} className="justify-end pr-2">
        P90
      </SortableHeader>
    ),
    cell: ({ row }) => (
      <div className="text-right pr-2">{row.original.p90.toFixed(2)}</div>
    ),
    enableSorting: true,
  },
];

export function FooCubeAggregationsTable({
  disableCache = false,
  apiUrl,
  title,
  subtitle = "Month × Status × Tag × Priority with percentiles",
}: {
  disableCache?: boolean;
  apiUrl: string;
  title: string;
  subtitle?: string;
}) {
  const [months, setMonths] = React.useState(6);
  const [status, setStatus] = React.useState<string | undefined>(undefined);
  const [tag, setTag] = React.useState<string | undefined>(undefined);
  const [priority, setPriority] = React.useState<number | undefined>(10);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const handleFilterOnChange = (updateFilter: () => void) => {
    updateFilter();
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handlePageSizeChange = (newPageSize: number) => {
    table.setPageSize(newPageSize);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const limit = pagination.pageSize;
  const offset = pagination.pageIndex * pagination.pageSize;

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [
      "foo-cube-aggregations",
      apiUrl,
      months,
      status,
      tag,
      priority,
      pagination.pageSize,
      pagination.pageIndex,
      sorting,
    ],
    queryFn: () => {
      const sortBy = sorting[0]?.id as
        | GetFooCubeAggregationsParams["sortBy"]
        | undefined;
      const sortOrder = sorting[0]?.desc
        ? "desc"
        : sorting[0]?.id
          ? "asc"
          : undefined;
      return fetchData(
        {
          months,
          status,
          tag,
          priority,
          limit,
          offset,
          sortBy,
          sortOrder,
        },
        apiUrl
      );
    },
    placeholderData: (prev) => prev,
    staleTime: disableCache ? 0 : 1000 * 60 * 5,
    gcTime: disableCache ? 0 : 1000 * 60 * 10,
    refetchOnMount: disableCache ? "always" : false,
    refetchOnWindowFocus: false,
  });

  const { data: filterValuesData, isLoading: isFilterValuesLoading } = useQuery(
    {
      queryKey: ["foo-filters-values", months],
      queryFn: () => fetchFilterValues({ months }),
      staleTime: disableCache ? 0 : 1000 * 60 * 15, // Cache longer since values change less frequently
      gcTime: disableCache ? 0 : 1000 * 60 * 30,
      refetchOnMount: disableCache ? "always" : false,
      refetchOnWindowFocus: false,
    }
  );

  const rows = data?.data ?? [];
  const queryTime = data?.queryTime;
  const filterValues = filterValuesData;
  const serverPagination = data?.pagination;

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: serverPagination
      ? Math.ceil(serverPagination.total / pagination.pageSize)
      : 0,
  });

  return (
    <Card>
      <CardContent>
        <div className="w-full flex flex-col justify-start gap-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              {typeof queryTime === "number" && (
                <div className="inline-flex items-baseline gap-2">
                  <span className="leading-none font-semibold text-card-foreground text-[16px]">
                    {title}
                  </span>
                  <span className="text-xs font-normal text-green-500">
                    Latest query:{" "}
                    <NumericFormat
                      value={Math.round(queryTime || 0)}
                      displayType="text"
                      thousandSeparator=","
                    />
                    ms
                  </span>
                </div>
              )}
              <div className="text-sm text-muted-foreground mt-1">
                {subtitle}
              </div>
            </div>
          </div>

          <div className="relative flex flex-col gap-4">
            {/* Filter controls */}
            <div className="flex flex-wrap gap-2">
              <Select
                value={status ?? "ALL"}
                onValueChange={(v) =>
                  handleFilterOnChange(() =>
                    setStatus(v === "ALL" ? undefined : v)
                  )
                }
                disabled={isFetching || isFilterValuesLoading}
              >
                <SelectTrigger className="w-40" size="sm">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">All status</SelectItem>
                  {filterValues?.status?.map((statusValue) => (
                    <SelectItem key={statusValue} value={statusValue}>
                      {statusValue}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={tag ?? "ALL"}
                onValueChange={(v) =>
                  handleFilterOnChange(() =>
                    setTag(v === "ALL" ? undefined : v)
                  )
                }
                disabled={isFetching || isFilterValuesLoading}
              >
                <SelectTrigger className="w-40" size="sm">
                  <SelectValue placeholder="Filter tag" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">All tags</SelectItem>
                  {filterValues?.tags?.map((tagValue) => (
                    <SelectItem key={tagValue} value={tagValue}>
                      {tagValue}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={priority === undefined ? "ALL" : String(priority)}
                onValueChange={(v) =>
                  handleFilterOnChange(() =>
                    setPriority(v === "ALL" ? undefined : Number(v))
                  )
                }
                disabled={isFetching || isFilterValuesLoading}
              >
                <SelectTrigger className="w-40" size="sm">
                  <SelectValue placeholder="Filter priority" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">All priorities</SelectItem>
                  {filterValues?.priorities?.map((priorityValue) => (
                    <SelectItem
                      key={priorityValue}
                      value={String(priorityValue)}
                    >
                      Priority {priorityValue}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(months)}
                onValueChange={(v) =>
                  handleFilterOnChange(() => setMonths(Number(v)))
                }
                disabled={isFetching}
              >
                <SelectTrigger className="w-36" size="sm">
                  <SelectValue placeholder="Months" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="3">Last 3 months</SelectItem>
                  <SelectItem value="6">Last 6 months</SelectItem>
                  <SelectItem value="12">Last 12 months</SelectItem>
                  <SelectItem value="24">Last 24 months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-hidden rounded-lg border relative">
              <Table key="foo-cube-aggregations-table">
                <TableHeader className="bg-muted sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {error ? (
                    <TableRow>
                      <TableCell
                        colSpan={columnDefs.length}
                        className="h-24 text-center"
                      >
                        <div className="text-red-500">
                          Error loading data: {String(error)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row, index) => (
                      <TableRow key={`${row.id}-${index}`}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : !isLoading && !isFetching ? (
                    <TableRow>
                      <TableCell
                        colSpan={columnDefs.length}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>

              {/* Loading Overlay */}
              {(isLoading || isFetching) && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-20">
                  <IconLoader className="animate-spin h-5 w-5" />
                </div>
              )}
            </div>

            {/* Pagination controls */}
            <div className="flex items-center justify-between">
              <div className="flex flex-1">
                {serverPagination && (
                  <div className="text-sm text-gray-600 flex items-center justify-between">
                    <div>
                      Showing{" "}
                      <NumericFormat
                        value={serverPagination.offset + 1}
                        displayType="text"
                        thousandSeparator
                      />{" "}
                      to{" "}
                      <NumericFormat
                        value={Math.min(
                          serverPagination.offset + serverPagination.limit,
                          serverPagination.total
                        )}
                        displayType="text"
                        thousandSeparator
                      />{" "}
                      of{" "}
                      <NumericFormat
                        value={serverPagination.total}
                        displayType="text"
                        thousandSeparator
                      />{" "}
                      items
                      {sorting.length > 0 && (
                        <span className="ml-2 text-blue-600">
                          • Sorted by {sorting[0].id} (
                          {sorting[0].desc ? "desc" : "asc"})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={`flex items-center space-x-6 lg:space-x-8`}>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">Rows per page</p>
                  <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) =>
                      handlePageSizeChange(Number(value))
                    }
                  >
                    <SelectTrigger
                      className="h-8 w-[70px]"
                      disabled={isFetching}
                    >
                      <SelectValue
                        placeholder={table.getState().pagination.pageSize}
                      />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-fit items-center justify-center text-sm font-medium">
                  <span>
                    Page{" "}
                    <NumericFormat
                      value={table.getState().pagination.pageIndex + 1}
                      displayType="text"
                      thousandSeparator
                    />{" "}
                    of{" "}
                    <NumericFormat
                      value={table.getPageCount()}
                      displayType="text"
                      thousandSeparator
                    />
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage() || isFetching}
                  >
                    <span className="sr-only">Go to first page</span>
                    <IconChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage() || isFetching}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <IconChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage() || isFetching}
                  >
                    <span className="sr-only">Go to next page</span>
                    <IconChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage() || isFetching}
                  >
                    <span className="sr-only">Go to last page</span>
                    <IconChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
