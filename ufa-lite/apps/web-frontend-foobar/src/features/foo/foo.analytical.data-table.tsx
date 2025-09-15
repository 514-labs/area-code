import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconLoader,
  IconCircleX,
  IconClock,
  IconArchive,
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
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
import {
  FooStatus,
} from "@workspace/models";
import { getAnalyticalApiBase } from "@/env-vars";
import {
  getApiFoo,
  GetApiFooQueryParams,
  GetFoosResponse,
  Foo as ApiFoo,
} from "@/analytical-api-client";
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
import React, { useState } from "react";
import { NumericFormat } from "react-number-format";
import { format } from "date-fns";

const SortableHeader = ({
  column,
  children,
  className,
}: {
  column: Column<ApiFoo, unknown>;
  children: React.ReactNode;
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

const fetchFoos = async (
  baseUrl: string,
  limit: number,
  offset: number,
  sortBy?: string,
  sortOrder?: string
): Promise<GetFoosResponse> => {
  const params: GetApiFooQueryParams = {
    limit,
    offset,
    sortBy,
    sortOrder,
  };

  const response: GetFoosResponse = await getApiFoo(params, {
    baseURL: baseUrl,
  });

  // Convert the response to match the expected format
  return {
    data: response.data,
    pagination: response.pagination,
    queryTime: response.queryTime,
  };
};

const createColumns = (): ColumnDef<ApiFoo>[] => {
  const baseColumns: ColumnDef<ApiFoo>[] = [
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

  baseColumns.push(
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column}>Name</SortableHeader>
      ),
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
      enableSorting: true,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div
          className="max-w-xs truncate"
          title={row.original.description || ""}
        >
          {row.original.description || (
            <span className="text-muted-foreground italic">No description</span>
          )}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <SortableHeader column={column}>Status</SortableHeader>
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        const getStatusIcon = () => {
          switch (status) {
            case FooStatus.ACTIVE:
              return (
                <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
              );
            case FooStatus.INACTIVE:
              return <IconCircleX className="text-red-500 dark:text-red-400" />;
            case FooStatus.PENDING:
              return (
                <IconClock className="text-yellow-500 dark:text-yellow-400" />
              );
            case FooStatus.ARCHIVED:
              return (
                <IconArchive className="text-gray-500 dark:text-gray-400" />
              );
            default:
              return <IconCircleX className="text-gray-400" />;
          }
        };

        return (
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="capitalize">{status}</span>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <SortableHeader column={column} className="text-right">
          Priority
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-right font-mono">{row.original.priority}</div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => (
        <SortableHeader column={column} className="text-center">
          Active
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.is_active ? (
            <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
          ) : (
            <IconCircleX className="text-red-500 dark:text-red-400" />
          )}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "score",
      header: ({ column }) => (
        <SortableHeader column={column} className="text-right">
          Score
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <NumericFormat
            value={row.original.score}
            displayType="text"
            thousandSeparator
            decimalScale={2}
            className="font-mono"
          />
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "tags",
      header: ({ column }) => (
        <SortableHeader column={column}>Tags</SortableHeader>
      ),
      cell: ({ row }) => {
        if (!row.original.tags) return null;
        const validTags = row.original.tags.filter((tag) => tag !== null);
        if (validTags.length === 0) return null;

        return (
          <div className="flex gap-1">
            {validTags.slice(0, 2).map((tag: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {validTags.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{validTags.length - 2} more
              </Badge>
            )}
          </div>
        );
      },
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
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => (
        <SortableHeader column={column}>Updated</SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {format(row.original.updated_at, "MMM d, yyyy h:mm a")}
        </div>
      ),
      enableSorting: true,
    }
  );

  return baseColumns;
};

export default function FooAnalyticalDataTable({
  disableCache = false,
}: {
  disableCache?: boolean;
}) {
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [queryTime, setQueryTime] = useState<number | null>(null);

  // Internal API endpoint for analytical data (read-only)
  const API_BASE = getAnalyticalApiBase();

  // Use React Query to fetch data - refetch will happen automatically when query key changes
  const {
    data: fooResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "foos-analytical",
      API_BASE,
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
    ],
    queryFn: async () => {
      const sortBy = sorting[0]?.id;
      const sortOrder = sorting[0]
        ? sorting[0].desc
          ? "desc"
          : "asc"
        : undefined;
      const result = await fetchFoos(
        API_BASE,
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

  const data = fooResponse?.data || [];
  const serverPagination = fooResponse?.pagination;

  const columns = createColumns();

  let availableColumns = columns.filter((col) => col.id !== "select");

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
    enableRowSelection: false,
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
                Foo CDC Table
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
                • Sorted by {sorting[0].id} ({sorting[0].desc ? "desc" : "asc"})
              </span>
            )}
          </div>
        </div>
      )}

      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-lg border">
          <Table key="foo-analytical-table">
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
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
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <IconLoader className="animate-spin" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
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
                    colSpan={columns.length}
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
