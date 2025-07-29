import { FastifyInstance } from "fastify";
import { eq, sql, asc, desc, inArray } from "drizzle-orm";
import { db } from "../database/connection";
import {
  foo,
  type Foo,
  type CreateFoo,
  type UpdateFoo,
  type DbFoo,
  type NewDbFoo,
} from "../database/schema";
import {
  FooStatus,
  GetFoosAverageScoreResponse,
  GetFoosParams,
  GetFoosResponse,
  GetFoosScoreOverTimeParams,
  GetFoosScoreOverTimeResponse,
} from "@workspace/models/foo";

// Convert database result to API type
function getModelFromDBRow(dbFoo: DbFoo): Foo {
  return {
    id: dbFoo.id,
    name: dbFoo.name,
    description: dbFoo.description,
    status: dbFoo.status as FooStatus,
    priority: dbFoo.priority,
    is_active: dbFoo.isActive,
    metadata: dbFoo.metadata || {},
    tags: dbFoo.tags || [],
    score: dbFoo.score ? parseFloat(dbFoo.score) : 0,
    large_text: dbFoo.largeText || "",
    created_at: dbFoo.createdAt,
    updated_at: dbFoo.updatedAt,
  };
}

// Convert API data to database format
function apiToDbFoo(apiData: CreateFoo | UpdateFoo): Partial<NewDbFoo> {
  const dbData: Partial<NewDbFoo> = {};

  // Copy over basic properties
  if ("name" in apiData && apiData.name !== undefined) {
    dbData.name = apiData.name;
  }
  if (apiData.description !== undefined) {
    dbData.description = apiData.description;
  }
  if (apiData.status !== undefined) {
    dbData.status = apiData.status;
  }
  if (apiData.priority !== undefined) {
    dbData.priority = apiData.priority;
  }
  if (apiData.is_active !== undefined) {
    dbData.isActive = apiData.is_active;
  }
  if (apiData.metadata !== undefined) {
    dbData.metadata = apiData.metadata;
  }
  if (apiData.large_text !== undefined) {
    dbData.largeText = apiData.large_text;
  }

  // Convert score from number to string for database
  if (apiData.score !== undefined && typeof apiData.score === "number") {
    dbData.score = apiData.score.toString();
  }

  // Ensure tags is properly handled as array
  if (apiData.tags !== undefined && apiData.tags !== null) {
    if (Array.isArray(apiData.tags)) {
      dbData.tags = apiData.tags;
    } else {
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
  // Get average score of all foo items with query time
  fastify.get<{
    Reply: GetFoosAverageScoreResponse | { error: string };
  }>("/foo/average-score", async (request, reply) => {
    try {
      const startTime = Date.now();

      // Get average score and count
      const result = await db
        .select({
          averageScore: sql<number>`AVG(CAST(score AS DECIMAL))`,
          count: sql<number>`COUNT(*)`,
        })
        .from(foo);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      const averageScore = result[0]?.averageScore || 0;
      const count = result[0]?.count || 0;

      return reply.send({
        averageScore: Number(averageScore),
        queryTime,
        count,
      });
    } catch (error) {
      console.error("Error calculating average score:", error);
      return reply
        .status(500)
        .send({ error: "Failed to calculate average score" });
    }
  });

  // Get foo score over time with daily aggregations
  fastify.get<{
    Querystring: GetFoosScoreOverTimeParams;
    Reply: GetFoosScoreOverTimeResponse | { error: string };
  }>("/foo/score-over-time", async (request, reply) => {
    try {
      const days = request.query.days || 90;

      // Validate days parameter
      if (days < 1 || days > 365) {
        return reply
          .status(400)
          .send({ error: "Days must be between 1 and 365" });
      }

      const startTime = Date.now();

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Format dates for SQL (YYYY-MM-DD)
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      // Query to get daily score aggregations using PostgreSQL date functions
      const result = await db
        .select({
          date: sql<string>`DATE(created_at)`,
          averageScore: sql<number>`AVG(CAST(score AS DECIMAL))`,
          totalCount: sql<number>`COUNT(*)`,
        })
        .from(foo)
        .where(
          sql`DATE(created_at) >= ${startDateStr} 
              AND DATE(created_at) <= ${endDateStr}
              AND score IS NOT NULL`
        )
        .groupBy(sql`DATE(created_at)`)
        .orderBy(sql`DATE(created_at) ASC`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      // Fill in missing dates with zero values
      const filledData: {
        date: string;
        averageScore: number;
        totalCount: number;
      }[] = [];

      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split("T")[0];
        const existingData = result.find((r) => r.date === dateStr);

        filledData.push({
          date: dateStr,
          averageScore:
            Math.round((Number(existingData?.averageScore) || 0) * 100) / 100, // Round to 2 decimal places
          totalCount: Number(existingData?.totalCount) || 0,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return reply.send({
        data: filledData,
        queryTime,
      });
    } catch (error) {
      console.error("Error calculating score over time:", error);
      return reply
        .status(500)
        .send({ error: "Failed to calculate score over time" });
    }
  });

  // Get all foo items with pagination and sorting
  fastify.get<{
    Querystring: GetFoosParams;
    Reply: GetFoosResponse | { error: string };
  }>("/foo", async (request, reply) => {
    try {
      const limit = request.query.limit || 10;
      const offset = request.query.offset || 0;
      const sortBy = request.query.sortBy;
      const sortOrder = request.query.sortOrder || "asc";

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        return reply
          .status(400)
          .send({ error: "Limit must be between 1 and 100" });
      }
      if (offset < 0) {
        return reply.status(400).send({ error: "Offset must be non-negative" });
      }

      // Build query with sorting - simplified approach
      let orderByClause;
      if (sortBy) {
        switch (sortBy) {
          case "name":
            orderByClause =
              sortOrder === "desc" ? desc(foo.name) : asc(foo.name);
            break;
          case "description":
            orderByClause =
              sortOrder === "desc"
                ? desc(foo.description)
                : asc(foo.description);
            break;
          case "status":
            orderByClause =
              sortOrder === "desc" ? desc(foo.status) : asc(foo.status);
            break;
          case "priority":
            orderByClause =
              sortOrder === "desc" ? desc(foo.priority) : asc(foo.priority);
            break;
          case "is_active":
            orderByClause =
              sortOrder === "desc" ? desc(foo.isActive) : asc(foo.isActive);
            break;
          case "score":
            orderByClause =
              sortOrder === "desc" ? desc(foo.score) : asc(foo.score);
            break;
          case "created_at":
            orderByClause =
              sortOrder === "desc" ? desc(foo.createdAt) : asc(foo.createdAt);
            break;
          case "updated_at":
            orderByClause =
              sortOrder === "desc" ? desc(foo.updatedAt) : asc(foo.updatedAt);
            break;
          default:
            // Default sorting by createdAt desc for invalid sortBy
            orderByClause = desc(foo.createdAt);
        }
      } else {
        // Default sorting by createdAt desc
        orderByClause = desc(foo.createdAt);
      }

      const startTime = Date.now();

      // Execute query with sorting and pagination
      const fooItems = await db
        .select()
        .from(foo)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination metadata
      const totalResult = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(foo);

      const queryTime = Date.now() - startTime;

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
        queryTime,
      });
    } catch (error) {
      console.error("Error fetching foo items:", error);
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
      } catch (err) {
        console.error("Fetch error:", err);
        return reply.status(500).send({ error: "Failed to fetch foo" });
      }
    }
  );

  // Create new foo
  fastify.post<{
    Body: CreateFoo;
    Reply: Foo | { error: string; details?: string; received?: CreateFoo };
  }>("/foo", async (request, reply) => {
    try {
      console.log(
        "Received request body:",
        JSON.stringify(request.body, null, 2)
      );

      // Convert API data to database format
      const dbData = apiToDbFoo(request.body);

      // Manually ensure all types are correct for database insert
      const insertData: NewDbFoo = {
        name: dbData.name || request.body.name,
        description: dbData.description ?? null,
        status:
          (dbData.status as "active" | "inactive" | "pending" | "archived") ||
          "active",
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
    } catch (err) {
      console.error("Validation error:", err);
      return reply.status(400).send({
        error: "Invalid foo data",
        details: err instanceof Error ? err.message : "Unknown error",
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
    } catch (err) {
      console.error("Update error:", err);
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
    } catch (err) {
      console.error("Delete error:", err);
      return reply.status(500).send({ error: "Failed to delete foo" });
    }
  });

  // Bulk delete foo items
  fastify.delete<{
    Body: { ids: string[] };
    Reply: { success: boolean; deletedCount: number } | { error: string };
  }>("/foo", async (request, reply) => {
    try {
      const { ids } = request.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send({ error: "Invalid or empty ids array" });
      }

      // Validate that all IDs are strings
      if (!ids.every((id) => typeof id === "string")) {
        return reply.status(400).send({ error: "All IDs must be strings" });
      }

      // Delete multiple foo items using the inArray helper from drizzle-orm
      const deletedFoos = await db
        .delete(foo)
        .where(inArray(foo.id, ids))
        .returning();

      return reply.send({
        success: true,
        deletedCount: deletedFoos.length,
      });
    } catch (err) {
      console.error("Error in bulk delete:", err);
      return reply.status(500).send({ error: "Failed to delete foo items" });
    }
  });
}
