import { FastifyInstance } from "fastify";
import { getDrizzleSupabaseClient } from "../database/connection";
import {
  foo,
  type Foo,
  type CreateFoo,
  type NewDbFoo,
} from "../database/schema";
import { convertDbFooToModel, convertModelToDbFoo } from "./foo-utils";

async function createFoo(data: CreateFoo, authToken?: string): Promise<Foo> {
  const dbData = convertModelToDbFoo(data);
  const insertData: NewDbFoo = {
    name: dbData.name || data.name,
    description: dbData.description ?? null,
    status:
      (dbData.status as "active" | "inactive" | "pending" | "archived") ||
      "active",
    priority: dbData.priority || 1,
    is_active: dbData.is_active !== undefined ? dbData.is_active : true,
    metadata: dbData.metadata || {},
    tags: Array.isArray(dbData.tags) ? dbData.tags : [],
    score: dbData.score || "0.00",
    large_text: dbData.large_text || "",
  };

  const client = await getDrizzleSupabaseClient(authToken);
  const newFoo = await client.runTransaction(async (tx) => {
    const result = await tx.insert(foo).values(insertData).returning();
    return result[0];
  });

  return convertDbFooToModel(newFoo);
}

export function createFooEndpoint(fastify: FastifyInstance) {
  fastify.post<{
    Body: CreateFoo;
    Reply: Foo | { error: string; details?: string; received?: CreateFoo };
  }>("/foo", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const authToken = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : undefined;

      const result = await createFoo(request.body, authToken);
      return reply.status(201).send(result);
    } catch (error) {
      console.error("Validation error:", error);

      if (
        error instanceof Error &&
        error.message.includes("permission denied")
      ) {
        return reply.status(403).send({
          error: "Permission denied",
          details: "Insufficient permissions to create foo",
        });
      }

      return reply.status(400).send({
        error: "Invalid foo data",
        details: error instanceof Error ? error.message : "Unknown error",
        received: request.body,
      });
    }
  });
}
