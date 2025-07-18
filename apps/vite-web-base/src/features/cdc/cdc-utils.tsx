import React from "react";
import {
  IconPlus,
  IconMinus,
  IconRefresh,
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
} from "@tabler/icons-react";
import { ColumnDef, Column } from "@tanstack/react-table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { format } from "date-fns";

// Shared CDC operation badge function
export function getCDCOperationBadge(
  operation?: "INSERT" | "UPDATE" | "DELETE"
) {
  if (!operation) return <Badge variant="outline">N/A</Badge>;

  switch (operation) {
    case "INSERT":
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700"
        >
          <IconPlus className="h-3 w-3 mr-1" />
          INSERT
        </Badge>
      );
    case "UPDATE":
      return (
        <Badge
          variant="default"
          className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700"
        >
          <IconRefresh className="h-3 w-3 mr-1" />
          UPDATE
        </Badge>
      );
    case "DELETE":
      return (
        <Badge
          variant="default"
          className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700"
        >
          <IconMinus className="h-3 w-3 mr-1" />
          DELETE
        </Badge>
      );
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

// Shared sortable header component
export const SortableHeader = <T extends Record<string, unknown>>({
  column,
  children,
  className,
}: {
  column: Column<T, unknown>;
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

// Generic CDC column definitions that can be used by any table
export function createCDCColumns<
  T extends {
    cdc_operation?: "INSERT" | "UPDATE" | "DELETE";
    cdc_timestamp?: string | Date;
  },
>(): ColumnDef<T>[] {
  return [
    {
      accessorKey: "cdc_operation",
      header: ({ column }) => (
        <SortableHeader column={column} className="ml-1">
          Batch Op
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="pl-2">
          {getCDCOperationBadge(row.original.cdc_operation)}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "cdc_timestamp",
      header: ({ column }) => (
        <SortableHeader column={column}>Batch Time</SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.cdc_timestamp
            ? format(new Date(row.original.cdc_timestamp), "MMM d, yyyy h:mm a")
            : "N/A"}
        </div>
      ),
      enableSorting: true,
    },
  ];
}
