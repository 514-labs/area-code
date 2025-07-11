import * as React from "react";
import { useState } from "react";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLayoutColumns,
  IconPlus,
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
  IconPencil,
  IconTrash,
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
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Bar as BaseBar, CreateBar } from "@workspace/models";

interface Bar extends BaseBar {
  foo?: Foo;
}

import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { getTransactionApiBase } from "../../env-vars";

interface Foo {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface BarResponse {
  data: Bar[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// API Functions
const fetchBars = async (
  fetchApiEndpoint: string,
  limit: number = 10,
  offset: number = 0,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
): Promise<BarResponse> => {
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

const updateBar = async ({
  id,
  data,
}: {
  id: string;
  data: CreateBar;
}): Promise<Bar> => {
  const API_BASE = getTransactionApiBase();
  const response = await fetch(`${API_BASE}/bar/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update bar");
  return response.json();
};

const deleteBar = async (id: string): Promise<void> => {
  const API_BASE = getTransactionApiBase();
  const response = await fetch(`${API_BASE}/bar/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete bar");
};

// Add a sortable header component
const SortableHeader = ({
  column,
  children,
  className,
}: {
  column: any;
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

const columns: ColumnDef<Bar>[] = [
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
    accessorKey: "fooId",
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
    accessorKey: "isEnabled",
    header: ({ column }) => (
      <SortableHeader column={column}>Status</SortableHeader>
    ),
    cell: ({ row }) => (
      <Badge variant={row.original.isEnabled ? "default" : "secondary"}>
        {row.original.isEnabled ? "Enabled" : "Disabled"}
      </Badge>
    ),
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
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <TableRowActions row={row} />,
    enableSorting: false,
    enableHiding: false,
  },
];

function TableRowActions({ row }: { row: any }) {
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState<CreateBar>({
    fooId: "",
    value: 0,
    label: "",
    notes: "",
    isEnabled: true,
  });

  const updateMutation = useMutation({
    mutationFn: updateBar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bars"] });
      setIsEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bars"] });
    },
  });

  const handleEdit = () => {
    setFormData({
      fooId: row.original.fooId,
      value: row.original.value,
      label: row.original.label || "",
      notes: row.original.notes || "",
      isEnabled: row.original.isEnabled,
    });
    setIsEditOpen(true);
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this bar?")) return;
    deleteMutation.mutate(row.original.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ id: row.original.id, data: formData });
  };

  return (
    <>
      <div className="flex space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleEdit}
          className="h-8 w-8"
        >
          <IconPencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="h-8 w-8"
        >
          <IconTrash className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bar</DialogTitle>
            <DialogDescription>Update the bar details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-label">Label</Label>
              <Input
                id="edit-label"
                value={formData.label || ""}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-value">Value *</Label>
              <Input
                id="edit-value"
                type="number"
                step="1"
                value={formData.value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    value: parseInt(e.target.value) || 0,
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isEnabled"
                checked={formData.isEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, isEnabled: e.target.checked })
                }
              />
              <Label htmlFor="edit-isEnabled">Is Enabled</Label>
            </div>
            <div className="flex space-x-2">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BarDataTable({
  data: _initialData,
  fetchApiEndpoint,
}: {
  data?: Bar[];
  fetchApiEndpoint: string;
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

  // Use React Query to fetch data - refetch will happen automatically when query key changes
  const {
    data: barResponse,
    isLoading,
    error,
    isPlaceholderData,
    refetch,
  } = useQuery({
    queryKey: ["bars", pagination.pageIndex, pagination.pageSize, sorting],
    queryFn: async () => {
      const startTime = performance.now();
      const sortBy = sorting[0]?.id;
      const sortOrder = sorting[0]?.desc ? "desc" : "asc";
      const result = await fetchBars(
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
    placeholderData: (previousData) => previousData,
  });

  const data = barResponse?.data || [];
  const serverPagination = barResponse?.pagination;

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

  const isMobile = useIsMobile();

  return (
    <div className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter by label..."
            value={(table.getColumn("label")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("label")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">Customize Columns</span>
                <span className="lg:hidden">Columns</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Server pagination and sorting info */}
      {serverPagination && (
        <div className="px-4 lg:px-6 mb-4 text-sm text-gray-600 flex items-center justify-between">
          <div>
            Showing {(serverPagination.offset + 1).toLocaleString()} to{" "}
            {Math.min(
              serverPagination.offset + serverPagination.limit,
              serverPagination.total
            ).toLocaleString()}{" "}
            of {serverPagination.total.toLocaleString()} items
            {serverPagination.hasMore && " (more available)"}
            {sorting.length > 0 && (
              <span className="ml-2 text-blue-600">
                • Sorted by {sorting[0].id} ({sorting[0].desc ? "desc" : "asc"})
              </span>
            )}
          </div>
          {queryTime !== null && (
            <div className="text-green-600">
              Latest query: {queryTime.toFixed(2)}ms
            </div>
          )}
        </div>
      )}

      <div className="relative flex flex-col gap-4 overflow-auto">
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
              {table.getRowModel().rows?.length ? (
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
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
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
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
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
    </div>
  );
}
