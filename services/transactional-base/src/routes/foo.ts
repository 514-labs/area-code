import { FastifyInstance } from "fastify";
import { eq, sql } from "drizzle-orm";
import { db } from "../database/connection";
import {
  foo,
  insertFooSchema,
  selectFooSchema,
  type Foo,
  type CreateFoo,
  type UpdateFoo,
  type DbFoo,
} from "../database/schema";
import { FooStatus } from "@workspace/models";

// Convert database result to API type
function getModelFromDBRow(dbFoo: DbFoo): Foo {
  return {
    id: dbFoo.id,
    name: dbFoo.name,
    description: dbFoo.description,
    status: dbFoo.status as FooStatus,
    priority: dbFoo.priority,
    isActive: dbFoo.isActive,
    metadata: dbFoo.metadata || {},
    tags: dbFoo.tags || [],
    score: dbFoo.score ? parseFloat(dbFoo.score) : 0,
    largeText: dbFoo.largeText || "",
    createdAt: dbFoo.createdAt,
    updatedAt: dbFoo.updatedAt,
  };
}

// Convert API data to database format
function apiToDbFoo(apiData: any): any {
  const dbData: any = { ...apiData };

  // Convert score from number to string for database
  if (typeof dbData.score === "number") {
    dbData.score = dbData.score.toString();
  }

  // Ensure tags is properly handled as array
  if (dbData.tags !== undefined && dbData.tags !== null) {
    if (typeof dbData.tags === "string") {
      // If it's a string, convert to array
      dbData.tags = dbData.tags
        .split(",")
        .map((tag: string) => tag.trim())
        .filter(Boolean);
    } else if (!Array.isArray(dbData.tags)) {
      // If it's not an array, make it an empty array
      dbData.tags = [];
    }
  } else {
    // If tags is undefined or null, set to empty array
    dbData.tags = [];
  }

  return dbData;
}

export async function fooRoutes(fastify: FastifyInstance) {
  // Get all foo items with pagination
  fastify.get<{
    Querystring: {
      limit?: string;
      offset?: string;
    };
    Reply:
      | {
          data: Foo[];
          pagination: {
            limit: number;
            offset: number;
            total: number;
            hasMore: boolean;
          };
        }
      | { error: string };
  }>("/foo", async (request, reply) => {
    try {
      const limit = parseInt(request.query.limit || "10");
      const offset = parseInt(request.query.offset || "0");

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        return reply
          .status(400)
          .send({ error: "Limit must be between 1 and 100" });
      }
      if (offset < 0) {
        return reply.status(400).send({ error: "Offset must be non-negative" });
      }

      // Get paginated results
      const fooItems = await db.select().from(foo).limit(limit).offset(offset);

      // Get total count for pagination metadata
      const totalResult = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(foo);

      const total = totalResult[0].count;
      const hasMore = offset + limit < total;

      const convertedFoo = fooItems.map(getModelFromDBRow);

      return reply.send({
        data: convertedFoo,
        pagination: {
          limit,
          offset,
          total,
          hasMore,
        },
      });
    } catch (error) {
      return reply.status(500).send({ error: "Failed to fetch foo items" });
    }
  });

  // Get foo by ID
  fastify.get<{ Params: { id: string }; Reply: Foo | { error: string } }>(
    "/foo/:id",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const fooItem = await db
          .select()
          .from(foo)
          .where(eq(foo.id, id))
          .limit(1);

        if (fooItem.length === 0) {
          return reply.status(404).send({ error: "Foo not found" });
        }

        const convertedFoo = getModelFromDBRow(fooItem[0]);
        return reply.send(convertedFoo);
      } catch (error) {
        return reply.status(500).send({ error: "Failed to fetch foo" });
      }
    }
  );

  // Create new foo
  fastify.post<{
    Body: CreateFoo;
    Reply: Foo | { error: string; details?: string; received?: any };
  }>("/foo", async (request, reply) => {
    try {
      console.log(
        "Received request body:",
        JSON.stringify(request.body, null, 2)
      );

      // Convert API data to database format
      const dbData = apiToDbFoo(request.body);

      // Manually ensure all types are correct for database insert
      const insertData = {
        name: dbData.name,
        description: dbData.description || null,
        status: dbData.status || "active",
        priority: dbData.priority || 1,
        isActive: dbData.isActive !== undefined ? dbData.isActive : true,
        metadata: dbData.metadata || {},
        config: dbData.config || {},
        tags: Array.isArray(dbData.tags) ? dbData.tags : [],
        score: dbData.score || "0.00",
        largeText: dbData.largeText || "",
      };

      const newFoo = await db.insert(foo).values(insertData).returning();

      const convertedFoo = getModelFromDBRow(newFoo[0]);
      return reply.status(201).send(convertedFoo);
    } catch (error) {
      console.error("Validation error:", error);
      return reply.status(400).send({
        error: "Invalid foo data",
        details: error instanceof Error ? error.message : "Unknown error",
        received: request.body,
      });
    }
  });

  // Update foo
  fastify.put<{
    Params: { id: string };
    Body: UpdateFoo;
    Reply: Foo | { error: string };
  }>("/foo/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const dbData = apiToDbFoo(request.body);

      // Manually ensure all types are correct for database update
      const updateData: any = {
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
      if (dbData.largeText !== undefined)
        updateData.largeText = dbData.largeText;

      const updatedFoo = await db
        .update(foo)
        .set(updateData)
        .where(eq(foo.id, id))
        .returning();

      if (updatedFoo.length === 0) {
        return reply.status(404).send({ error: "Foo not found" });
      }

      const convertedFoo = getModelFromDBRow(updatedFoo[0]);
      return reply.send(convertedFoo);
    } catch (error) {
      return reply.status(400).send({ error: "Failed to update foo" });
    }
  });

  // Delete foo
  fastify.delete<{
    Params: { id: string };
    Reply: { success: boolean } | { error: string };
  }>("/foo/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const deletedFoo = await db.delete(foo).where(eq(foo.id, id)).returning();

      if (deletedFoo.length === 0) {
        return reply.status(404).send({ error: "Foo not found" });
      }

      return reply.send({ success: true });
    } catch (error) {
      return reply.status(500).send({ error: "Failed to delete foo" });
    }
  });
}