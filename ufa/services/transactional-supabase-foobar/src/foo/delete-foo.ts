import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../database/connection";
import { foo } from "../database/schema";

async function deleteFoo(id: string): Promise<{ success: boolean }> {
  const deletedFoo = await db.delete(foo).where(eq(foo.id, id)).returning();

  if (deletedFoo.length === 0) {
    throw new Error("Foo not found");
  }

  return { success: true };
}

export function deleteFooEndpoint(fastify: FastifyInstance) {
  fastify.delete<{
    Params: { id: string };
    Reply: { success: boolean } | { error: string };
  }>("/foo/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await deleteFoo(id);
      return reply.send(result);
    } catch (error) {
      console.error("Delete error:", error);
      if (error instanceof Error && error.message === "Foo not found") {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(500).send({ error: "Failed to delete foo" });
    }
  });
}
