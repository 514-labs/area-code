import { eq } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { getDrizzleSupabaseClient } from "../database/connection";
import { bar, foo, type Bar, type UpdateBar } from "../database/schema";

async function updateBar(
  id: string,
  data: UpdateBar,
  authToken?: string
): Promise<Bar> {
  const updateData = {
    ...data,
    updated_at: new Date(),
  };

  const client = await getDrizzleSupabaseClient(authToken);
  const updatedBar = await client.runTransaction(async (tx) => {
    if (data.foo_id) {
      const fooExists = await tx
        .select()
        .from(foo)
        .where(eq(foo.id, data.foo_id))
        .limit(1);

      if (fooExists.length === 0) {
        throw new Error("Referenced foo does not exist");
      }
    }

    const result = await tx
      .update(bar)
      .set(updateData)
      .where(eq(bar.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error("Bar not found");
    }

    return result[0];
  });

  return updatedBar;
}

export function updateBarEndpoint(fastify: FastifyInstance) {
  fastify.put<{
    Params: { id: string };
    Body: UpdateBar;
    Reply: Bar | { error: string };
  }>("/bar/:id", async (request, reply) => {
    try {
      const authToken = request.headers.authorization?.replace("Bearer ", "");
      const result = await updateBar(
        request.params.id,
        request.body,
        authToken
      );
      return reply.send(result);
    } catch (error) {
      console.error("Update bar error:", error);
      if (error instanceof Error && error.message === "Bar not found") {
        return reply.status(404).send({ error: error.message });
      }
      if (
        error instanceof Error &&
        error.message === "Referenced foo does not exist"
      ) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(400).send({ error: "Invalid bar data" });
    }
  });
}
