import * as React from "react";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
  IconLoader,
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
import { BarWithCDC } from "@workspace/models";
import { format } from "date-fns";
import { NumericFormat } from "react-number-format";

// Import shared CDC utilities
import { createCDCColumns } from "../cdc/cdc-utils";

// Add a sortable header component
const SortableHeader = ({
  column,
  children,
  className,
}: {
  column: Column<BarWithCDC, unknown>;
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

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
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
import { Textarea } from "@workspace/ui/components/textarea";
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

interface BarResponse {
  data: BarWithCDC[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  queryTime: number;
}

const fetchBars = async (
  endpoint: string,
  limit: number,
  offset: number,
  sortBy?: string,
  sortOrder?: string
): Promise<BarResponse> => {
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

const deleteBar = async (endpoint: string, id: string): Promise<void> => {
  const response = await fetch(`${endpoint}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete bar");
};

const editBar = async (
  endpoint: string,
  id: string,
  data: Partial<BarWithCDC>
): Promise<BarWithCDC> => {
  const response = await fetch(`${endpoint}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to edit bar");
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

export function BarCDCDataTable({
  fetchApiEndpoint,
  disableCache = false,
  selectableRows = false,
  deleteApiEndpoint,
  editApiEndpoint,
}: {
  fetchApiEndpoint: string;
  disableCache?: boolean;
  selectableRows?: boolean;
  deleteApiEndpoint?: string;
  editApiEndpoint?: string;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [queryTime, setQueryTime] = React.useState<number>(0);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Use React Query to fetch data - refetch will happen automatically when query key changes
  const {
    data: barResponse,
    isLoading,
    error,
    refetch,
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

  // Build columns based on available actions
  const availableColumns = React.useMemo(() => {
    const baseColumns = selectableRows
      ? columns
      : columns.filter((col) => col.id !== "select");

    if (!editApiEndpoint && !deleteApiEndpoint) {
      return baseColumns; // No action column needed
    }

    const actionColumn: ColumnDef<BarWithCDC> = {
      id: "actions",
      cell: ({ row }) => {
        const bar = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <IconDotsVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {editApiEndpoint && (
                <EditBarDialog
                  bar={bar}
                  editApiEndpoint={editApiEndpoint}
                  onSuccess={() => refetch()}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <IconEdit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  }
                />
              )}
              {deleteApiEndpoint && (
                <DeleteBarDialog
                  barId={bar.id}
                  deleteApiEndpoint={deleteApiEndpoint}
                  onSuccess={() => refetch()}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      Delete
                    </DropdownMenuItem>
                  }
                />
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    };

    return [...baseColumns, actionColumn];
  }, [selectableRows, editApiEndpoint, deleteApiEndpoint, refetch]);

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
  const selectedBars = selectedRows.map((row) => row.original);

  const handleDeleteSelected = async () => {
    if (!deleteApiEndpoint || selectedBars.length === 0) return;

    try {
      await Promise.all(
        selectedBars.map((bar) => deleteBar(deleteApiEndpoint, bar.id))
      );
      setRowSelection({});
      refetch();
    } catch (error) {
      console.error("Failed to delete bars:", error);
    }
  };

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500">Error loading bars: {String(error)}</p>
        <Button onClick={() => refetch()} className="mt-2">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full flex-col justify-start gap-6">
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
            {serverPagination.hasMore && " (more available)"}
            {sorting.length > 0 && (
              <span className="ml-2 text-blue-600">
                • Sorted by {sorting[0].id} ({sorting[0].desc ? "desc" : "asc"})
              </span>
            )}
          </div>
          {queryTime > 0 && (
            <div className="text-green-600">
              Latest query:{" "}
              <NumericFormat
                value={Math.round(queryTime || 0)}
                displayType="text"
                thousandSeparator=","
              />
              ms
            </div>
          )}
        </div>
      )}

      <div className="relative flex flex-col gap-4 overflow-auto">
        {selectableRows && selectedBars.length > 0 && deleteApiEndpoint && (
          <div className="flex items-center py-4">
            <DeleteSelectedBarsDialog
              selectedCount={selectedBars.length}
              onConfirm={handleDeleteSelected}
              trigger={
                <Button variant="destructive" size="sm">
                  Delete{" "}
                  <NumericFormat
                    value={selectedBars.length}
                    displayType="text"
                    thousandSeparator=","
                  />{" "}
                  selected row{selectedBars.length === 1 ? "" : "s"}
                </Button>
              }
            />
          </div>
        )}
        <div className="overflow-hidden rounded-lg border">
          <Table key={fetchApiEndpoint}>
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
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
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
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {selectableRows && (
            <>
              <NumericFormat
                value={table.getFilteredSelectedRowModel().rows.length}
                displayType="text"
                thousandSeparator=","
              />{" "}
              of{" "}
              <NumericFormat
                value={table.getFilteredRowModel().rows.length}
                displayType="text"
                thousandSeparator=","
              />{" "}
              row(s) selected.
            </>
          )}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
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
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditBarDialogProps {
  bar: BarWithCDC;
  editApiEndpoint: string;
  onSuccess: () => void;
  trigger: React.ReactNode;
}

function EditBarDialog({
  bar,
  editApiEndpoint,
  onSuccess,
  trigger,
}: EditBarDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const data = {
        foo_id: formData.get("foo_id") as string,
        value: parseFloat(formData.get("value") as string),
        label: formData.get("label") as string,
        notes: formData.get("notes") as string,
        is_enabled: formData.get("is_enabled") === "on",
      };

      await editBar(editApiEndpoint, bar.id, data);
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Failed to edit bar:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="foo_id">Associated Foo ID</Label>
        <Input id="foo_id" name="foo_id" defaultValue={bar.foo_id} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="value">Value</Label>
        <Input
          id="value"
          name="value"
          type="number"
          step="0.01"
          defaultValue={bar.value}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input id="label" name="label" defaultValue={bar.label || ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={bar.notes || ""} />
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_enabled"
          name="is_enabled"
          defaultChecked={bar.is_enabled}
        />
        <Label htmlFor="is_enabled">Is Enabled</Label>
      </div>
      <div className="text-sm text-muted-foreground space-y-1">
        <p>Created: {format(new Date(bar.created_at), "MMM d, yyyy h:mm a")}</p>
        <p>Updated: {format(new Date(bar.updated_at), "MMM d, yyyy h:mm a")}</p>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );

  if (useIsMobile()) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Bar</DrawerTitle>
            <DrawerDescription>
              Make changes to the bar. Click save when you're done.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Bar</AlertDialogTitle>
          <AlertDialogDescription>
            Make changes to the bar. Click save when you're done.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {content}
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DeleteBarDialogProps {
  barId: string;
  deleteApiEndpoint: string;
  onSuccess: () => void;
  trigger: React.ReactNode;
}

function DeleteBarDialog({
  barId,
  deleteApiEndpoint,
  onSuccess,
  trigger,
}: DeleteBarDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteBar(deleteApiEndpoint, barId);
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Failed to delete bar:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the bar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DeleteSelectedBarsDialogProps {
  selectedCount: number;
  onConfirm: () => void;
  trigger: React.ReactNode;
}

function DeleteSelectedBarsDialog({
  selectedCount,
  onConfirm,
  trigger,
}: DeleteSelectedBarsDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete{" "}
            <NumericFormat
              value={selectedCount}
              displayType="text"
              thousandSeparator=","
            />{" "}
            bar(s).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Delete{" "}
            <NumericFormat
              value={selectedCount}
              displayType="text"
              thousandSeparator=","
            />{" "}
            Bar(s)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
