import { eq } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { getDrizzleSupabaseClient } from "../database/connection";
import { bar } from "../database/schema";

async function deleteBar(
  id: string,
  authToken?: string
): Promise<{ success: boolean }> {
  const client = await getDrizzleSupabaseClient(authToken);
  const deletedBar = await client.runTransaction(async (tx) => {
    return await tx.delete(bar).where(eq(bar.id, id)).returning();
  });

  if (deletedBar.length === 0) {
    throw new Error("Bar not found");
  }

  return { success: true };
}

export function deleteBarEndpoint(fastify: FastifyInstance) {
  fastify.delete<{
    Params: { id: string };
    Reply: { success: boolean } | { error: string };
  }>("/bar/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const authHeader = request.headers.authorization;
      const authToken = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : undefined;

      const result = await deleteBar(id, authToken);
      return reply.send(result);
    } catch (error) {
      console.error("Delete error:", error);

      if (error instanceof Error && error.message === "Bar not found") {
        return reply.status(404).send({ error: error.message });
      }

      if (
        error instanceof Error &&
        error.message.includes("permission denied")
      ) {
        return reply.status(403).send({
          error: "Permission denied",
        });
      }

      return reply.status(500).send({ error: "Failed to delete bar" });
    }
  });
}
