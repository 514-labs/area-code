import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../database/connection";
import {
  foo,
  type Foo,
  type UpdateFoo,
  type NewDbFoo,
} from "../database/schema";
import { getModelFromDBRow, apiToDbFoo } from "./foo-utils";

async function updateFoo(id: string, data: UpdateFoo): Promise<Foo> {
  const dbData = apiToDbFoo(data);

  // Manually ensure all types are correct for database update
  const updateData: Partial<NewDbFoo> = {
    updatedAt: new Date(),
  };

  // Only update fields that are provided
  if (dbData.name !== undefined) updateData.name = dbData.name;
  if (dbData.description !== undefined)
    updateData.description = dbData.description;
  if (dbData.status !== undefined) updateData.status = dbData.status;
  if (dbData.priority !== undefined) updateData.priority = dbData.priority;
  if (dbData.isActive !== undefined) updateData.isActive = dbData.isActive;
  if (dbData.metadata !== undefined) updateData.metadata = dbData.metadata;
  if (dbData.config !== undefined) updateData.config = dbData.config;
  if (dbData.tags !== undefined)
    updateData.tags = Array.isArray(dbData.tags) ? dbData.tags : [];
  if (dbData.score !== undefined) updateData.score = dbData.score;
  if (dbData.largeText !== undefined) updateData.largeText = dbData.largeText;

  const updatedFoo = await db
    .update(foo)
    .set(updateData)
    .where(eq(foo.id, id))
    .returning();

  if (updatedFoo.length === 0) {
    throw new Error("Foo not found");
  }

  return getModelFromDBRow(updatedFoo[0]);
}

export function updateFooEndpoint(fastify: FastifyInstance) {
  fastify.put<{
    Params: { id: string };
    Body: UpdateFoo;
    Reply: Foo | { error: string };
  }>("/foo/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await updateFoo(id, request.body);
      return reply.send(result);
    } catch (error) {
      console.error("Update error:", error);
      if (error instanceof Error && error.message === "Foo not found") {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(400).send({ error: "Failed to update foo" });
    }
  });
}
