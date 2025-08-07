import { inArray } from "drizzle-orm";
import { db } from "../database/connection";
import { bar } from "../database/schema";

export async function bulkDeleteBars(
  ids: string[]
): Promise<{ success: boolean; deletedCount: number }> {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Invalid or empty ids array");
  }

  // Validate that all IDs are strings
  if (!ids.every((id) => typeof id === "string")) {
    throw new Error("All IDs must be strings");
  }

  // Delete multiple bar items using the inArray helper from drizzle-orm
  const deletedBars = await db
    .delete(bar)
    .where(inArray(bar.id, ids))
    .returning();

  return {
    success: true,
    deletedCount: deletedBars.length,
  };
}
