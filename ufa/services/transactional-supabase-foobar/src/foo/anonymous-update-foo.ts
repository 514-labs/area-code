import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDrizzleSupabaseAdminClient } from "../database/connection";
import { foo, type Foo } from "../database/schema";
import { convertDbFooToModel } from "./foo-utils";

async function anonymousUpdateFoo(id: string): Promise<Foo> {
  // Use admin client (no auth token) to bypass RLS
  const client = await getDrizzleSupabaseAdminClient();

  const result = await client.runTransaction(async (tx) => {
    const currentFoo = await tx.select().from(foo).where(eq(foo.id, id));

    if (currentFoo.length === 0) {
      throw new Error("Foo not found");
    }

    const existingFoo = currentFoo[0];
    const newName = `${existingFoo.name} (edited)`;

    const updatedFoo = await tx
      .update(foo)
      .set({
        name: newName,
        updated_at: new Date(),
      })
      .where(eq(foo.id, id))
      .returning();

    return updatedFoo[0];
  });

  return convertDbFooToModel(result);
}

export function anonymousUpdateFooEndpoint(fastify: FastifyInstance) {
  fastify.put<{
    Params: { id: string };
    Reply: Foo | { error: string };
  }>("/foo/:id/anonymous-update", async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await anonymousUpdateFoo(id);
      return reply.send(result);
    } catch (error) {
      console.error("Anonymous update error:", error);

      if (error instanceof Error && error.message === "Foo not found") {
        return reply.status(404).send({ error: error.message });
      }

      return reply
        .status(400)
        .send({ error: "Failed to update foo anonymously" });
    }
  });
}
