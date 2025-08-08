import { eq } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { db } from "../database/connection";
import { bar } from "../database/schema";

async function deleteBar(id: string): Promise<{ success: boolean }> {
  const deletedBar = await db.delete(bar).where(eq(bar.id, id)).returning();

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
      const result = await deleteBar(request.params.id);
      return reply.status(200).send(result);
    } catch (error) {
      console.error("Delete bar error:", error);
      if (error instanceof Error && error.message === "Bar not found") {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(500).send({ error: "Failed to delete bar" });
    }
  });
}
