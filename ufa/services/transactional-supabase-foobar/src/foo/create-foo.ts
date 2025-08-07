import { FastifyInstance } from "fastify";
import { db } from "../database/connection";
import {
  foo,
  type Foo,
  type CreateFoo,
  type NewDbFoo,
} from "../database/schema";
import { convertDbFooToModel, convertModelToDbFoo } from "./foo-utils";

async function createFoo(data: CreateFoo): Promise<Foo> {
  console.log("Received request body:", JSON.stringify(data, null, 2));

  // Convert API data to database format - minimal conversion now needed
  const dbData = convertModelToDbFoo(data);

  // Manually ensure all types are correct for database insert
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

  const newFoo = await db.insert(foo).values(insertData).returning();

  return convertDbFooToModel(newFoo[0]);
}

export function createFooEndpoint(fastify: FastifyInstance) {
  fastify.post<{
    Body: CreateFoo;
    Reply: Foo | { error: string; details?: string; received?: CreateFoo };
  }>("/foo", async (request, reply) => {
    try {
      const result = await createFoo(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      console.error("Validation error:", error);
      return reply.status(400).send({
        error: "Invalid foo data",
        details: error instanceof Error ? error.message : "Unknown error",
        received: request.body,
      });
    }
  });
}
