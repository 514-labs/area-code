import { FastifyInstance } from "fastify";
import { inArray } from "drizzle-orm";
import { getDrizzleSupabaseClient } from "../database/connection";
import { foo } from "../database/schema";

async function bulkDeleteFoos(
  ids: string[],
  authToken?: string
): Promise<{ success: boolean; deletedCount: number }> {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Invalid or empty ids array");
  }

  // Validate that all IDs are strings
  if (!ids.every((id) => typeof id === "string")) {
    throw new Error("All IDs must be strings");
  }

  // Delete multiple foo items using the inArray helper from drizzle-orm
  const client = await getDrizzleSupabaseClient(authToken);
  const deletedFoos = await client.runTransaction(async (tx) => {
    return await tx.delete(foo).where(inArray(foo.id, ids)).returning();
  });

  return {
    success: true,
    deletedCount: deletedFoos.length,
  };
}

export function bulkDeleteFoosEndpoint(fastify: FastifyInstance) {
  fastify.delete<{
    Body: { ids: string[] };
    Reply: { success: boolean; deletedCount: number } | { error: string };
  }>("/foo", async (request, reply) => {
    try {
      const { ids } = request.body;
      const authToken = request.headers.authorization?.replace("Bearer ", "");
      const result = await bulkDeleteFoos(ids, authToken);
      return reply.send(result);
    } catch (error) {
      console.error("Error in bulk delete:", error);
      if (
        error instanceof Error &&
        (error.message.includes("Invalid or empty ids") ||
          error.message.includes("All IDs must be"))
      ) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: "Failed to delete foo items" });
    }
  });
}
