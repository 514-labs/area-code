import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
  IconLoader,
} from "@tabler/icons-react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  Column,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { BarWithCDC, GetBarsWithCDCResponse } from "@workspace/models/bar";
import { getAnalyticalConsumptionApiBase } from "@/env-vars";
import { format } from "date-fns";
import { NumericFormat } from "react-number-format";
import { createCDCColumns } from "../cdc/cdc-utils";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { ReactNode, useState } from "react";

const SortableHeader = ({
  column,
  children,
  className,
}: {
  column: Column<BarWithCDC, unknown>;
  children: ReactNode;
  className?: string;
}) => {
  if (!column.getCanSort()) {
    return <div className={className}>{children}</div>;
  }

  const handleSort = () => {
    const currentSort = column.getIsSorted();
    column.toggleSorting(currentSort === "asc");
  };

  return (
    <Button
      variant="ghost"
      onClick={handleSort}
      className={`-ml-3 h-8 data-[state=open]:bg-accent ${className}`}
    >
      <span>{children}</span>
      {column.getIsSorted() === "desc" ? (
        <IconArrowDown className="ml-2 h-4 w-4" />
      ) : column.getIsSorted() === "asc" ? (
        <IconArrowUp className="ml-2 h-4 w-4" />
      ) : (
        <IconArrowsSort className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
};

const fetchBars = async (
  endpoint: string,
  limit: number,
  offset: number,
  sortBy?: string,
  sortOrder?: string
): Promise<GetBarsWithCDCResponse> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (sortBy) params.append("sortBy", sortBy);
  if (sortOrder) params.append("sortOrder", sortOrder);

  const response = await fetch(`${endpoint}?${params}`);
  if (!response.ok) throw new Error("Failed to fetch bars");
  return response.json();
};

// Create columns with CDC support
const createColumns = (): ColumnDef<BarWithCDC>[] => {
  const baseColumns: ColumnDef<BarWithCDC>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center px-1">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];

  // Add CDC columns using shared utility
  const cdcColumns = createCDCColumns<BarWithCDC>();
  baseColumns.push(...cdcColumns);

  // Add main data columns
  baseColumns.push(
    {
      accessorKey: "label",
      header: ({ column }) => (
        <SortableHeader column={column}>Label</SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.label || (
            <span className="text-muted-foreground italic">No label</span>
          )}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "value",
      header: ({ column }) => (
        <SortableHeader column={column}>Value</SortableHeader>
      ),
      cell: ({ row }) => <div className="font-mono">{row.original.value}</div>,
      enableSorting: true,
    },
    {
      accessorKey: "foo_id",
      header: "Associated Foo ID",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.original.foo_id}</div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.original.notes || (
            <span className="text-muted-foreground italic">No notes</span>
          )}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "is_enabled",
      header: ({ column }) => (
        <SortableHeader column={column}>Status</SortableHeader>
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.is_enabled ? "default" : "secondary"}>
          {row.original.is_enabled ? "Enabled" : "Disabled"}
        </Badge>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <SortableHeader column={column}>Created</SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {format(new Date(row.original.created_at), "MMM d, yyyy h:mm a")}
        </div>
      ),
      enableSorting: true,
    }
  );

  return baseColumns;
};

export default function BarAnalyticalDataTable({
  disableCache = false,
  selectableRows = false,
}: {
  disableCache?: boolean;
  selectableRows?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "cdc_timestamp", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [queryTime, setQueryTime] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Internal API endpoint for analytical data (read-only)
  const API_BASE = getAnalyticalConsumptionApiBase();
  const fetchApiEndpoint = `${API_BASE}/bar`;

  // Use React Query to fetch data - refetch will happen automatically when query key changes
  const {
    data: barResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "bars-cdc",
      fetchApiEndpoint,
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
    ],
    queryFn: async () => {
      const sortBy = sorting[0]?.id;
      const sortOrder = sorting[0]?.desc ? "desc" : "asc";
      const result = await fetchBars(
        fetchApiEndpoint,
        pagination.pageSize,
        pagination.pageIndex * pagination.pageSize,
        sortBy,
        sortOrder
      );
      setQueryTime(result.queryTime);
      return result;
    },
    // Keep previous data visible while fetching new data
    placeholderData: (previousData) => previousData,
    staleTime: disableCache ? 0 : 1000 * 60 * 5, // 5 minutes when enabled
    gcTime: disableCache ? 0 : 1000 * 60 * 10, // 10 minutes when enabled
    refetchOnMount: disableCache ? "always" : false,
    refetchOnWindowFocus: false,
  });

  const data = barResponse?.data || [];
  const serverPagination = barResponse?.pagination;

  // Get columns with CDC support
  const columns = createColumns();

  let availableColumns = columns.filter((col) => col.id !== "select");
  if (selectableRows) {
    availableColumns = columns;
  }

  const table = useReactTable({
    data,
    columns: availableColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: selectableRows,
    onRowSelectionChange: setRowSelection,
    onSortingChange: (updater) => {
      setSorting(updater);
      // Reset to first page when sorting changes
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    // Server-side pagination and sorting
    manualPagination: true,
    manualSorting: true,
    pageCount: serverPagination
      ? Math.ceil(serverPagination.total / pagination.pageSize)
      : 0,
  });

  return (
    <div className="w-full flex-col justify-start gap-6">
      {serverPagination && (
        <div className="px-4 lg:px-6 mb-4 text-sm text-gray-600 flex items-center justify-between">
          {queryTime !== null && (
            <div className="inline-flex items-baseline gap-2">
              <span className="leading-none font-semibold text-card-foreground text-[16px]">
                Bar Analytical
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
          <div>
            Showing{" "}
            <NumericFormat
              value={serverPagination.offset + 1}
              displayType="text"
              thousandSeparator=","
            />{" "}
            to{" "}
            <NumericFormat
              value={Math.min(
                serverPagination.offset + serverPagination.limit,
                serverPagination.total
              )}
              displayType="text"
              thousandSeparator=","
            />{" "}
            of{" "}
            <NumericFormat
              value={serverPagination.total}
              displayType="text"
              thousandSeparator=","
            />{" "}
            items
            {serverPagination.hasMore && " (more available)"}
            {sorting.length > 0 && (
              <span className="ml-2 text-blue-600">
                • Sorted by {sorting[0].id} ({sorting[0].desc ? "desc" : "asc"})
              </span>
            )}
          </div>
        </div>
      )}

      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-lg border">
          <Table key="bar-analytical-table">
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={availableColumns.length}
                    className="h-24 text-center"
                  >
                    <div className="flex items-center justify-center">
                      <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={availableColumns.length}
                    className="h-24 text-center"
                  >
                    <div className="text-red-500">
                      Error loading data: {error.message}
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, index) => (
                  <TableRow
                    key={`${row.id}-${index}`}
                    data-state={row.getIsSelected() && "selected"}
                  >
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
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={availableColumns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-2">
          <div className={`flex items-center space-x-6 lg:space-x-8`}>
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Rows per page</p>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
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
                  thousandSeparator=","
                />{" "}
                of{" "}
                <NumericFormat
                  value={table.getPageCount()}
                  displayType="text"
                  thousandSeparator=","
                />
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage() || isLoading}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage() || isLoading}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage() || isLoading}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage() || isLoading}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
