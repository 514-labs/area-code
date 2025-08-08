import { eq } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { db } from "../database/connection";
import {
  bar,
  foo,
  type Bar,
  type UpdateBar,
  type NewDbBar,
} from "../database/schema";

async function updateBar(id: string, data: UpdateBar): Promise<Bar> {
  const updateData: Partial<NewDbBar> = {
    ...data,
    updated_at: new Date(),
  };

  // If updating foo_id, verify that foo exists
  if (updateData.foo_id) {
    const fooExists = await db
      .select()
      .from(foo)
      .where(eq(foo.id, updateData.foo_id))
      .limit(1);

    if (fooExists.length === 0) {
      throw new Error("Referenced foo does not exist");
    }
  }

  const updatedBar = await db
    .update(bar)
    .set(updateData)
    .where(eq(bar.id, id))
    .returning({
      id: bar.id,
      foo_id: bar.foo_id,
      value: bar.value,
      label: bar.label,
      notes: bar.notes,
      is_enabled: bar.is_enabled,
      created_at: bar.created_at,
      updated_at: bar.updated_at,
    });

  if (updatedBar.length === 0) {
    throw new Error("Bar not found");
  }

  return updatedBar[0];
}

export function updateBarEndpoint(fastify: FastifyInstance) {
  fastify.put<{
    Params: { id: string };
    Body: UpdateBar;
    Reply: Bar | { error: string };
  }>("/bar/:id", async (request, reply) => {
    try {
      const result = await updateBar(request.params.id, request.body);
      return reply.status(200).send(result);
    } catch (error) {
      console.error("Update bar error:", error);
      if (
        error instanceof Error &&
        error.message === "Referenced foo does not exist"
      ) {
        return reply.status(400).send({ error: error.message });
      }
      if (error instanceof Error && error.message === "Bar not found") {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(400).send({ error: "Invalid bar data" });
    }
  });
}
