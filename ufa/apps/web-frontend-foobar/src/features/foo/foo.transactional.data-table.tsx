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
  IconDotsVertical,
  IconEdit,
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
import { Foo, FooStatus, GetFoosResponse } from "@workspace/models/foo";
import { getTransactionApiBase } from "@/env-vars";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
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
import { ReactNode, useState, useRef } from "react";
import { NumericFormat } from "react-number-format";
import { format } from "date-fns";

// Add a sortable header component
const SortableHeader = ({
  column,
  children,
  className,
}: {
  column: Column<Foo, unknown>;
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
            return <IconArchive className="text-gray-500 dark:text-gray-400" />;
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
        {format(new Date(row.original.updated_at), "MMM d, yyyy h:mm a")}
      </div>
    ),
    enableSorting: true,
  },
];

// API Functions
const fetchFoos = async (
  fetchApiEndpoint: string,
  limit: number = 10,
  offset: number = 0,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
): Promise<GetFoosResponse> => {
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

export default function FooTransactionalDataTable({
  disableCache = false,
  selectableRows = false,
}: {
  disableCache?: boolean;
  selectableRows?: boolean;
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Internal API endpoints for transactional data
  const API_BASE = getTransactionApiBase();
  const fetchApiEndpoint = `${API_BASE}/foo`;
  const deleteApiEndpoint = `${API_BASE}/foo`;
  const editApiEndpoint = `${API_BASE}/foo`;

  // Use React Query to fetch data - refetch will happen automatically when query key changes
  const {
    data: fooResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "foos",
      fetchApiEndpoint,
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
    ],
    queryFn: async () => {
      const sortBy = sorting[0]?.id;
      const sortOrder = sorting[0]?.desc ? "desc" : "asc";
      const result = await fetchFoos(
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

  const data = fooResponse?.data || [];
  const serverPagination = fooResponse?.pagination;

  // Create a shared drawer state and handler for each row
  const [drawerStates, setDrawerStates] = useState<Record<string, boolean>>({});

  const openDrawer = (itemId: string) => {
    setDrawerStates((prev) => ({ ...prev, [itemId]: true }));
  };

  const closeDrawer = (itemId: string) => {
    setDrawerStates((prev) => ({ ...prev, [itemId]: false }));
  };

  // Create actions column if editApiEndpoint is provided
  const actionsColumn: ColumnDef<Foo> = {
    id: "actions",
    cell: ({ row }) => {
      const itemId = row.original.id;
      const isDrawerOpen = drawerStates[itemId] || false;

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                size="icon"
              >
                <IconDotsVertical />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem
                onClick={() => openDrawer(itemId)}
                className="cursor-pointer"
              >
                <IconEdit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TableCellViewer
            item={row.original}
            editApiEndpoint={editApiEndpoint}
            onSave={() => refetch()}
            isOpen={isDrawerOpen}
            onOpenChange={(open) =>
              open ? openDrawer(itemId) : closeDrawer(itemId)
            }
          />
        </>
      );
    },
    enableSorting: false,
    enableHiding: false,
  };

  // Create custom name column with edit functionality
  const nameColumn: ColumnDef<Foo> = {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column}>Name</SortableHeader>
    ),
    cell: ({ row }) => {
      const itemId = row.original.id;
      const isDrawerOpen = drawerStates[itemId] || false;

      return (
        <>
          <Button
            variant="link"
            className="text-foreground w-fit px-0 text-left"
            onClick={() => openDrawer(itemId)}
          >
            {row.original.name}
          </Button>
          <TableCellViewer
            item={row.original}
            editApiEndpoint={editApiEndpoint}
            onSave={() => refetch()}
            isOpen={isDrawerOpen}
            onOpenChange={(open) =>
              open ? openDrawer(itemId) : closeDrawer(itemId)
            }
          />
        </>
      );
    },
    enableHiding: false,
    enableSorting: true,
  };

  // Conditionally include columns based on props
  let availableColumns = selectableRows
    ? columns
    : columns.filter((col) => col.id !== "select");

  // Replace the original name column with the custom one that has edit functionality
  availableColumns = availableColumns.map((col) =>
    "accessorKey" in col && col.accessorKey === "name" ? nameColumn : col
  );

  // Add actions column for transactional tables
  availableColumns = [...availableColumns, actionsColumn];

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

  // Delete functionality
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedFoos = selectedRows.map((row) => row.original);

  const handleDelete = async () => {
    if (selectedFoos.length === 0) return;

    setIsDeleting(true);
    try {
      const selectedIds = selectedFoos.map((foo) => foo.id);
      const response = await fetch(deleteApiEndpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete rows");
      }

      // Reset selection and close dialog
      setRowSelection({});
      setIsDeleteDialogOpen(false);

      // Refetch data to update the table
      await refetch();
    } catch (error) {
      console.error("Delete error:", error);
      // You might want to add toast notification here
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full flex-col justify-start gap-6">
      {/* Server pagination and sorting info */}
      {serverPagination && (
        <div className="px-4 lg:px-6 mb-4 text-sm text-gray-600 flex items-center justify-between">
          {queryTime !== null && (
            <div className="inline-flex items-baseline gap-2">
              <span className="leading-none font-semibold text-card-foreground text-[16px]">
                Foo Transactional
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
            {sorting.length > 0 && (
              <span className="ml-2 text-blue-600">
                • Sorted by {sorting[0].id} ({sorting[0].desc ? "desc" : "asc"})
              </span>
            )}
          </div>
        </div>
      )}

      <div
        className="relative flex flex-col gap-4 overflow-auto"
        key="foo-transactional-table"
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
          {selectableRows && (
            <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
              {selectedFoos.length > 0 ? (
                <AlertDialog
                  open={isDeleteDialogOpen}
                  onOpenChange={setIsDeleteDialogOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      Delete {selectedFoos.length} selected row
                      {selectedFoos.length === 1 ? "" : "s"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete the following items:
                        <div className="mt-3 p-3 bg-muted rounded-md max-h-40 overflow-y-auto">
                          <ul className="list-disc list-inside space-y-1">
                            {selectedFoos.map((foo) => (
                              <li key={foo.id} className="text-sm">
                                {foo.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive hover:bg-destructive/90 cursor-pointer"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <>
                  {table.getFilteredSelectedRowModel().rows.length} of{" "}
                  {table.getFilteredRowModel().rows.length} row(s) selected.
                </>
              )}
            </div>
          )}
          <div
            className={`flex items-center gap-8 ${selectableRows ? "w-full lg:w-fit" : "w-full justify-end"}`}
          >
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

function TableCellViewer({
  item,
  editApiEndpoint,
  onSave,
  triggerElement,
  isOpen,
  onOpenChange,
}: {
  item: Foo;
  editApiEndpoint?: string;
  onSave?: () => void;
  triggerElement?: ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSave = async (formData: FormData) => {
    if (!editApiEndpoint) return;

    setIsSaving(true);
    try {
      const updatedItem = {
        ...item,
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        status: formData.get("status") as string,
        priority: parseInt(formData.get("priority") as string),
        score: parseFloat(formData.get("score") as string),
        is_active: formData.get("is_active") === "on",
        tags: (formData.get("tags") as string)
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        large_text: formData.get("large_text") as string,
      };

      const response = await fetch(`${editApiEndpoint}/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedItem),
      });

      if (!response.ok) {
        throw new Error("Failed to update item");
      }

      // Close the drawer on success
      onOpenChange?.(false);
      // Refresh the data
      onSave?.();
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      {triggerElement && isOpen === undefined && (
        <DrawerTrigger asChild>{triggerElement}</DrawerTrigger>
      )}
      {!triggerElement && isOpen === undefined && (
        <DrawerTrigger asChild>
          <Button
            variant="link"
            className="text-foreground w-fit px-0 text-left"
          >
            {item.name}
          </Button>
        </DrawerTrigger>
      )}
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.name}</DrawerTitle>
          <DrawerDescription>Foo details - ID: {item.id}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <form
            ref={formRef}
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (editApiEndpoint) {
                const formData = new FormData(e.currentTarget);
                handleSave(formData);
              }
            }}
          >
            <div className="flex flex-col gap-3">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={item.name} />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={item.description || ""}
                placeholder="No description provided"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={item.status}>
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
                  name="priority"
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
                  name="score"
                  type="number"
                  step="0.01"
                  defaultValue={item.score}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_active"
                  name="is_active"
                  defaultChecked={item.is_active}
                />
                <Label htmlFor="is_active">Is Active</Label>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={item.tags.join(", ")}
                placeholder="Comma-separated tags"
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="large_text">Large Text</Label>
              <Textarea
                id="large_text"
                name="large_text"
                defaultValue={item.large_text}
                rows={4}
              />
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
                  {new Date(item.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Label>Updated At</Label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  {new Date(item.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </form>
        </div>
        <DrawerFooter>
          {editApiEndpoint ? (
            <Button
              disabled={isSaving}
              onClick={(e) => {
                e.preventDefault();
                if (formRef.current) {
                  const formData = new FormData(formRef.current);
                  handleSave(formData);
                }
              }}
            >
              {isSaving ? (
                <>
                  <IconLoader className="animate-spin h-4 w-4 mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          ) : (
            <Button disabled>View Only</Button>
          )}
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
