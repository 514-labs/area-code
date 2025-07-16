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
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { Foo, FooStatus } from "@workspace/models";

import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { ReactNode, useEffect, useState } from "react";
import { NumericFormat } from "react-number-format";

const getStatusIcon = (status: FooStatus) => {
  switch (status) {
    case FooStatus.ACTIVE:
      return (
        <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
      );
    case FooStatus.INACTIVE:
      return <IconCircleX className="text-red-500 dark:text-red-400" />;
    case FooStatus.PENDING:
      return <IconClock className="text-yellow-500 dark:text-yellow-400" />;
    case FooStatus.ARCHIVED:
      return <IconArchive className="text-gray-500 dark:text-gray-400" />;
    default:
      return <IconLoader />;
  }
};

const getStatusColor = (status: FooStatus) => {
  switch (status) {
    case FooStatus.ACTIVE:
      return "bg-green-100 border-green-700 text-green-800 dark:bg-green-900 dark:text-green-300";
    case FooStatus.INACTIVE:
      return "bg-red-100 border-red-700  text-red-800 dark:bg-red-900 dark:text-red-300";
    case FooStatus.PENDING:
      return "bg-yellow-100 border-yellow-700 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case FooStatus.ARCHIVED:
      return "bg-gray-100 border-gray-700 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    default:
      return "bg-gray-100 border-gray-700 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  }
};

// Add a sortable header component
const SortableHeader = ({
  column,
  children,
  className,
}: {
  column: any; // eslint-disable-line @typescript-eslint/no-explicit-any
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

const columns: ColumnDef<Foo>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center px-1">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column}>Name</SortableHeader>
    ),
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />;
    },
    enableHiding: false,
    enableSorting: true,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <SortableHeader column={column}>Description</SortableHeader>
    ),
    cell: ({ row }) => (
      <div
        className="max-w-xs truncate"
        title={row.original.description || "No description"}
      >
        {row.original.description || "No description"}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <SortableHeader column={column}>Status</SortableHeader>
    ),
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={`py-[3px] ${getStatusColor(row.original.status)}`}
      >
        {getStatusIcon(row.original.status)}
        <span className="ml-1 capitalize">{row.original.status}</span>
      </Badge>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <SortableHeader column={column} className="text-center">
        Priority
      </SortableHeader>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">
        {row.original.priority.toLocaleString()}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <SortableHeader column={column} className="text-center">
        Active
      </SortableHeader>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        {row.original.isActive ? (
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
      <div className="text-right font-medium">
        {(row.original?.score || 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
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
    // Remove custom sortingFn for server-side sorting
    enableSorting: true,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <SortableHeader column={column}>Created</SortableHeader>
    ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <SortableHeader column={column}>Updated</SortableHeader>
    ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {new Date(row.original.updatedAt).toLocaleDateString()}
      </div>
    ),
    enableSorting: true,
  },
];

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
  fetchApiEndpoint: string,
  limit: number = 10,
  offset: number = 0,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
): Promise<FooResponse> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (sortBy && sortOrder) {
    params.append("sortBy", sortBy);
    params.append("sortOrder", sortOrder);
  }

  const response = await fetch(`${fetchApiEndpoint}?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch foos");
  return response.json();
};

export function FooDataTable({
  fetchApiEndpoint,
  disableCache = false,
}: {
  fetchApiEndpoint: string;
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

  // Reset pagination and state when endpoint changes
  useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: 10 });
    setSorting([]);
    setRowSelection({});
  }, [fetchApiEndpoint]);

  // Use React Query to fetch data - refetch will happen automatically when query key changes
  const {
    data: fooResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "foos",
      fetchApiEndpoint,
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
    ],
    queryFn: async () => {
      const startTime = performance.now();
      const sortBy = sorting[0]?.id;
      const sortOrder = sorting[0]?.desc ? "desc" : "asc";
      const result = await fetchFoos(
        fetchApiEndpoint,
        pagination.pageSize,
        pagination.pageIndex * pagination.pageSize,
        sortBy,
        sortOrder
      );
      const endTime = performance.now();
      setQueryTime(endTime - startTime);
      return result;
    },
    // Completely disable placeholder data - only show current query results
    placeholderData: undefined,
    staleTime: disableCache ? 0 : 1000 * 60 * 5, // 5 minutes when enabled
    gcTime: disableCache ? 0 : 1000 * 60 * 10, // 10 minutes when enabled
    refetchOnMount: disableCache ? "always" : false,
    refetchOnWindowFocus: false,
  });

  const data = fooResponse?.data || [];
  const serverPagination = fooResponse?.pagination;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
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
      {/* Server pagination and sorting info */}
      {serverPagination && (
        <div className="px-4 lg:px-6 mb-4 text-sm text-gray-600 flex items-center justify-between">
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
            {sorting.length > 0 && (
              <span className="ml-2 text-blue-600">
                • Sorted by {sorting[0].id} ({sorting[0].desc ? "desc" : "asc"})
              </span>
            )}
          </div>
          {queryTime !== null && (
            <div className="text-green-600">
              Latest query:{" "}
              {(queryTime || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              ms
            </div>
          )}
        </div>
      )}

      <div
        className="relative flex flex-col gap-4 overflow-auto"
        key={fetchApiEndpoint} // Changed key to fetchApiEndpoint
      >
        <div className="overflow-hidden rounded-lg border">
          <Table>
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
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
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
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage() || isLoading}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage() || isLoading}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage() || isLoading}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage() || isLoading}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableCellViewer({ item }: { item: Foo }) {
  const isMobile = useIsMobile();

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.name}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.name}</DrawerTitle>
          <DrawerDescription>Foo details - ID: {item.id}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue={item.name} />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                defaultValue={item.description || ""}
                placeholder="No description provided"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue={item.status}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FooStatus.ACTIVE}>Active</SelectItem>
                    <SelectItem value={FooStatus.INACTIVE}>Inactive</SelectItem>
                    <SelectItem value={FooStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={FooStatus.ARCHIVED}>Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  defaultValue={item.priority}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="score">Score</Label>
                <Input
                  id="score"
                  type="number"
                  step="0.01"
                  defaultValue={item.score}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="isActive" defaultChecked={item.isActive} />
                <Label htmlFor="isActive">Is Active</Label>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                defaultValue={item.tags.join(", ")}
                placeholder="Comma-separated tags"
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="largeText">Large Text</Label>
              <Textarea id="largeText" defaultValue={item.largeText} rows={4} />
            </div>
            <div className="flex flex-col gap-3">
              <Label>Metadata</Label>
              <div className="p-3 bg-muted rounded-md">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(item.metadata, null, 2)}
                </pre>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label>Created At</Label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Label>Updated At</Label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  {new Date(item.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button>Save Changes</Button>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
