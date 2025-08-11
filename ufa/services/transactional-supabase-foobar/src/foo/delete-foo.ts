import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDrizzleSupabaseClient } from "../database/connection";
import { foo } from "../database/schema";

async function deleteFoo(
  id: string,
  authToken?: string
): Promise<{ success: boolean }> {
  const client = await getDrizzleSupabaseClient(authToken);
  const deletedFoo = await client.runTransaction(async (tx) => {
    return await tx.delete(foo).where(eq(foo.id, id)).returning();
  });

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
      const authHeader = request.headers.authorization;
      const authToken = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : undefined;

      const result = await deleteFoo(id, authToken);
      return reply.send(result);
    } catch (error) {
      console.error("Delete error:", error);

      if (error instanceof Error && error.message === "Foo not found") {
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

      return reply.status(500).send({ error: "Failed to delete foo" });
    }
  });
}
