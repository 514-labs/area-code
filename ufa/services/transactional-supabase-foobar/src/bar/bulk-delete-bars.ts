import { inArray } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { db } from "../database/connection";
import { bar } from "../database/schema";

async function bulkDeleteBars(
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

export function bulkDeleteBarsEndpoint(fastify: FastifyInstance) {
  fastify.delete<{
    Body: { ids: string[] };
    Reply: { success: boolean; deletedCount: number } | { error: string };
  }>("/bar", async (request, reply) => {
    try {
      const result = await bulkDeleteBars(request.body.ids);
      return reply.status(200).send(result);
    } catch (error) {
      console.error("Bulk delete bars error:", error);
      if (
        error instanceof Error &&
        (error.message === "Invalid or empty ids array" ||
          error.message === "All IDs must be strings")
      ) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: "Failed to delete bars" });
    }
  });
}
