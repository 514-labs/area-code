import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDrizzleSupabaseClient } from "../database/connection";
import {
  foo,
  type Foo,
  type UpdateFoo,
  type NewDbFoo,
} from "../database/schema";
import { convertDbFooToModel, convertModelToDbFoo } from "./foo-utils";

async function updateFoo(
  id: string,
  data: UpdateFoo,
  authToken?: string
): Promise<Foo> {
  const dbData = convertModelToDbFoo(data);

  const updateData: Partial<NewDbFoo> = {
    updated_at: new Date(),
  };

  if (dbData.name !== undefined) updateData.name = dbData.name;
  if (dbData.description !== undefined)
    updateData.description = dbData.description;
  if (dbData.status !== undefined) updateData.status = dbData.status;
  if (dbData.priority !== undefined) updateData.priority = dbData.priority;
  if (dbData.is_active !== undefined) updateData.is_active = dbData.is_active;
  if (dbData.metadata !== undefined) updateData.metadata = dbData.metadata;
  if (dbData.tags !== undefined)
    updateData.tags = Array.isArray(dbData.tags) ? dbData.tags : [];
  if (dbData.score !== undefined) updateData.score = dbData.score;
  if (dbData.large_text !== undefined)
    updateData.large_text = dbData.large_text;

  const client = await getDrizzleSupabaseClient(authToken);
  const updatedFoo = await client.runTransaction(async (tx) => {
    return await tx
      .update(foo)
      .set(updateData)
      .where(eq(foo.id, id))
      .returning();
  });

  if (updatedFoo.length === 0) {
    throw new Error("Foo not found");
  }

  return convertDbFooToModel(updatedFoo[0]);
}

export function updateFooEndpoint(fastify: FastifyInstance) {
  fastify.put<{
    Params: { id: string };
    Body: UpdateFoo;
    Reply: Foo | { error: string };
  }>("/foo/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const authHeader = request.headers.authorization;
      const authToken = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : undefined;

      const result = await updateFoo(id, request.body, authToken);
      return reply.send(result);
    } catch (error) {
      console.error("Update error:", error);

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

      return reply.status(400).send({ error: "Failed to update foo" });
    }
  });
}
