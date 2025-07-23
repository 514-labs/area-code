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
import { getTransactionApiBase } from "@/env-vars";
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
import { format } from "date-fns";
import { NumericFormat } from "react-number-format";
import { Bar, BarWithFoo, GetBarsResponse } from "@workspace/models/bar";

// API Functions
const fetchBars = async (
  fetchApiEndpoint: string,
  limit: number = 10,
  offset: number = 0,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
): Promise<GetBarsResponse> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (sortBy && sortOrder) {
    params.append("sortBy", sortBy);
    params.append("sortOrder", sortOrder);
  }

  const response = await fetch(`${fetchApiEndpoint}?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch bars");
  return response.json();
};

// Add a sortable header component
const SortableHeader = ({
  column,
  children,
  className,
}: {
  column: Column<BarWithFoo, unknown>;
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

const columns: ColumnDef<BarWithFoo>[] = [
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
    header: "Associated Foo",
    cell: ({ row }) => (
      <div>
        {row.original.foo ? (
          <div className="flex items-center space-x-2">
            <span className="font-medium">{row.original.foo.name}</span>
            <Badge variant="outline" className="text-xs">
              {row.original.foo.status}
            </Badge>
          </div>
        ) : (
          <span className="text-muted-foreground">Unknown</span>
        )}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => (
      <div className="max-w-xs truncate" title={row.original.notes || ""}>
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
  },
];

export default function BarTransactionalDataTable({
  disableCache = false,
  selectableRows = false,
}: {
  disableCache?: boolean;
  selectableRows?: boolean;
}) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [queryTime, setQueryTime] = React.useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Internal API endpoints for transactional data
  const API_BASE = getTransactionApiBase();
  const fetchApiEndpoint = `${API_BASE}/bar`;
  const deleteApiEndpoint = `${API_BASE}/bar`;
  const editApiEndpoint = `${API_BASE}/bar`;

  // Use React Query to fetch data - refetch will happen automatically when query key changes
  const {
    data: barResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "bars",
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

  // Create actions column if editApiEndpoint is provided
  const actionsColumn: ColumnDef<BarWithFoo> = {
    id: "actions",
    cell: ({ row }) => {
      const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

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
                onClick={() => setIsDrawerOpen(true)}
                className="cursor-pointer"
              >
                <IconEdit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <BarCellViewer
            item={row.original}
            editApiEndpoint={editApiEndpoint}
            onSave={() => refetch()}
            isOpen={isDrawerOpen}
            onOpenChange={setIsDrawerOpen}
          />
        </>
      );
    },
    enableSorting: false,
    enableHiding: false,
  };

  // Conditionally include columns based on props
  let availableColumns = selectableRows
    ? columns
    : columns.filter((col) => col.id !== "select");

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
  const selectedBars = selectedRows.map((row) => row.original);

  const handleDelete = async () => {
    if (selectedBars.length === 0) return;

    setIsDeleting(true);
    try {
      const selectedIds = selectedBars.map((bar) => bar.id);
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
      {serverPagination && (
        <div className="px-4 lg:px-6 mb-4 text-sm text-gray-600 flex items-center justify-between">
          {queryTime !== null && (
            <div className="inline-flex items-baseline gap-2">
              <span className="leading-none font-semibold text-card-foreground text-[16px]">
                Bar Transactional
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
          <Table key={fetchApiEndpoint}>
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
          {selectableRows && (
            <div className="flex-1 text-sm text-muted-foreground">
              {selectedBars.length > 0 ? (
                <AlertDialog
                  open={isDeleteDialogOpen}
                  onOpenChange={setIsDeleteDialogOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      Delete{" "}
                      <NumericFormat
                        value={selectedBars.length}
                        displayType="text"
                        thousandSeparator=","
                      />{" "}
                      selected row{selectedBars.length === 1 ? "" : "s"}
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
                            {selectedBars.map((bar) => (
                              <li key={bar.id} className="text-sm">
                                {bar.label || "Untitled Bar"}
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
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
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
          )}
          <div
            className={`flex items-center space-x-6 lg:space-x-8 ${!selectableRows ? "w-full justify-end" : ""}`}
          >
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

function BarCellViewer({
  item,
  editApiEndpoint,
  onSave,
  triggerElement,
  isOpen,
  onOpenChange,
}: {
  item: Bar;
  editApiEndpoint?: string;
  onSave?: () => void;
  triggerElement?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [isSaving, setIsSaving] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleSave = async (formData: FormData) => {
    if (!editApiEndpoint) return;

    setIsSaving(true);
    try {
      const updatedItem = {
        id: item.id,
        foo_id: formData.get("foo_id") as string,
        value: parseInt(formData.get("value") as string),
        label: (formData.get("label") as string) || null,
        notes: (formData.get("notes") as string) || null,
        is_enabled: formData.get("is_enabled") === "on",
      };

      console.log("Sending update request:", updatedItem);

      const response = await fetch(`${editApiEndpoint}/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedItem),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(
          `Failed to update item: ${response.status} ${errorText}`
        );
      }

      const result = await response.json();
      console.log("Update successful:", result);

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
            {item.label || "Untitled Bar"}
          </Button>
        </DrawerTrigger>
      )}
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.label || "Untitled Bar"}</DrawerTitle>
          <DrawerDescription>Bar details - ID: {item.id}</DrawerDescription>
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
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                name="label"
                defaultValue={item.label || ""}
                placeholder="Enter label"
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                name="value"
                type="number"
                defaultValue={item.value}
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="foo_id">Associated Foo ID</Label>
              <Input
                id="foo_id"
                name="foo_id"
                defaultValue={item.foo_id}
                placeholder="Foo ID"
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={item.notes || ""}
                placeholder="Add notes..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_enabled"
                name="is_enabled"
                defaultChecked={item.is_enabled}
              />
              <Label htmlFor="is_enabled">Is Enabled</Label>
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
