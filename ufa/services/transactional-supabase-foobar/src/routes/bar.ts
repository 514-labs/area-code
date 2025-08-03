import { FastifyInstance } from "fastify";
import { eq, desc, asc, sql, inArray } from "drizzle-orm";
import { db } from "../database/connection";
import {
  bar,
  foo,
  insertBarSchema,
  type Bar,
  type CreateBar,
  type UpdateBar,
  type NewDbBar,
} from "../database/schema";
import {
  GetBarsAverageValueResponse,
  GetBarsParams,
  GetBarsResponse,
  BarWithFoo,
} from "@workspace/models/bar";

export async function barRoutes(fastify: FastifyInstance) {
  // Get average value of all bar items with query time
  fastify.get<{
    Reply: GetBarsAverageValueResponse | { error: string };
  }>("/bar/average-value", async (request, reply) => {
    try {
      const startTime = Date.now();

      // Get average value and count
      const result = await db
        .select({
          averageValue: sql<number>`AVG(CAST(value AS DECIMAL))`,
          count: sql<number>`COUNT(*)`,
        })
        .from(bar);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      const averageValue = result[0]?.averageValue || 0;
      const count = result[0]?.count || 0;

      return reply.send({
        averageValue: Number(averageValue),
        queryTime,
        count,
      });
    } catch (err) {
      console.error("Error calculating average value:", err);
      return reply
        .status(500)
        .send({ error: "Failed to calculate average value" });
    }
  });

  // Get all bar items with pagination and sorting
  fastify.get<{
    Querystring: GetBarsParams;
    Reply: GetBarsResponse | { error: string };
  }>("/bar", async (request, reply) => {
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

      // Build query with sorting
      let orderByClause;
      if (sortBy) {
        switch (sortBy) {
          case "label":
            orderByClause =
              sortOrder === "desc" ? desc(bar.label) : asc(bar.label);
            break;
          case "value":
            orderByClause =
              sortOrder === "desc" ? desc(bar.value) : asc(bar.value);
            break;
          case "is_enabled":
            orderByClause =
              sortOrder === "desc" ? desc(bar.isEnabled) : asc(bar.isEnabled);
            break;
          case "created_at":
            orderByClause =
              sortOrder === "desc" ? desc(bar.createdAt) : asc(bar.createdAt);
            break;
          case "updated_at":
            orderByClause =
              sortOrder === "desc" ? desc(bar.updatedAt) : asc(bar.updatedAt);
            break;
          default:
            // Default sorting by createdAt desc for invalid sortBy
            orderByClause = desc(bar.createdAt);
        }
      } else {
        // Default sorting by createdAt desc
        orderByClause = desc(bar.createdAt);
      }

      const startTime = Date.now();

      // Execute query with sorting and pagination
      const barItems = await db
        .select({
          id: bar.id,
          foo_id: bar.fooId,
          value: bar.value,
          label: bar.label,
          notes: bar.notes,
          is_enabled: bar.isEnabled,
          created_at: bar.createdAt,
          updated_at: bar.updatedAt,
          foo: {
            id: foo.id,
            name: foo.name,
            description: foo.description,
            status: foo.status,
            priority: foo.priority,
            is_active: foo.isActive,
            metadata: foo.metadata,
            tags: foo.tags,
            created_at: foo.createdAt,
            updated_at: foo.updatedAt,
            score: foo.score,
            large_text: foo.largeText,
          },
        })
        .from(bar)
        .innerJoin(foo, eq(bar.fooId, foo.id))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination metadata
      const totalResult = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(bar)
        .innerJoin(foo, eq(bar.fooId, foo.id));

      const queryTime = Date.now() - startTime;

      const total = totalResult[0].count;
      const hasMore = offset + limit < total;

      return reply.send({
        data: barItems as unknown as BarWithFoo[],
        pagination: {
          limit,
          offset,
          total,
          hasMore,
        },
        queryTime,
      });
    } catch (err) {
      console.error("Error fetching bars:", err);
      return reply.status(500).send({ error: "Failed to fetch bar items" });
    }
  });

  // Get bar by ID with foo details
  fastify.get<{
    Params: { id: string };
    Reply: BarWithFoo | { error: string };
  }>("/bar/:id", async (request, reply) => {
    try {
      const { id } = request.params;

      const barWithFoo = await db
        .select({
          id: bar.id,
          foo_id: bar.fooId,
          value: bar.value,
          label: bar.label,
          notes: bar.notes,
          is_enabled: bar.isEnabled,
          created_at: bar.createdAt,
          updated_at: bar.updatedAt,
          foo: {
            id: foo.id,
            name: foo.name,
            description: foo.description,
            status: foo.status,
            priority: foo.priority,
            is_active: foo.isActive,
            metadata: foo.metadata,
            tags: foo.tags,
            created_at: foo.createdAt,
            updated_at: foo.updatedAt,
            score: foo.score,
          },
        })
        .from(bar)
        .innerJoin(foo, eq(bar.fooId, foo.id))
        .where(eq(bar.id, id))
        .limit(1);

      if (barWithFoo.length === 0) {
        return reply.status(404).send({ error: "Bar not found" });
      }

      return reply.send(barWithFoo[0] as unknown as BarWithFoo);
    } catch (err) {
      console.error("Error fetching bar:", err);
      return reply.status(500).send({ error: "Failed to fetch bar" });
    }
  });

  // Create new bar
  fastify.post<{ Body: CreateBar; Reply: Bar | { error: string } }>(
    "/bar",
    async (request, reply) => {
      try {
        const validatedData = insertBarSchema.parse(request.body);

        // Verify that foo exists
        const fooExists = await db
          .select()
          .from(foo)
          .where(eq(foo.id, validatedData.fooId))
          .limit(1);

        if (fooExists.length === 0) {
          return reply
            .status(400)
            .send({ error: "Referenced foo does not exist" });
        }

        const newBar = await db.insert(bar).values(validatedData).returning({
          id: bar.id,
          foo_id: bar.fooId,
          value: bar.value,
          label: bar.label,
          notes: bar.notes,
          is_enabled: bar.isEnabled,
          created_at: bar.createdAt,
          updated_at: bar.updatedAt,
        });

        return reply.status(201).send(newBar[0]);
      } catch (err) {
        console.error("Create bar error:", err);
        return reply.status(400).send({ error: "Invalid bar data" });
      }
    }
  );

  // Update bar
  fastify.put<{
    Params: { id: string };
    Body: UpdateBar;
    Reply: Bar | { error: string };
  }>("/bar/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData: Partial<NewDbBar> = {
        ...request.body,
        updatedAt: new Date(),
      };

      // If updating fooId, verify that foo exists
      if (updateData.fooId) {
        const fooExists = await db
          .select()
          .from(foo)
          .where(eq(foo.id, updateData.fooId))
          .limit(1);

        if (fooExists.length === 0) {
          return reply
            .status(400)
            .send({ error: "Referenced foo does not exist" });
        }
      }

      const updatedBar = await db
        .update(bar)
        .set(updateData)
        .where(eq(bar.id, id))
        .returning({
          id: bar.id,
          foo_id: bar.fooId,
          value: bar.value,
          label: bar.label,
          notes: bar.notes,
          is_enabled: bar.isEnabled,
          created_at: bar.createdAt,
          updated_at: bar.updatedAt,
        });

      if (updatedBar.length === 0) {
        return reply.status(404).send({ error: "Bar not found" });
      }

      return reply.send(updatedBar[0]);
    } catch (err) {
      console.error("Update bar error:", err);
      return reply.status(400).send({ error: "Failed to update bar" });
    }
  });

  // Delete bar
  fastify.delete<{
    Params: { id: string };
    Reply: { success: boolean } | { error: string };
  }>("/bar/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const deletedBar = await db.delete(bar).where(eq(bar.id, id)).returning();

      if (deletedBar.length === 0) {
        return reply.status(404).send({ error: "Bar not found" });
      }

      return reply.send({ success: true });
    } catch (err) {
      console.error("Delete bar error:", err);
      return reply.status(500).send({ error: "Failed to delete bar" });
    }
  });

  // Bulk delete bar items
  fastify.delete<{
    Body: { ids: string[] };
    Reply: { success: boolean; deletedCount: number } | { error: string };
  }>("/bar", async (request, reply) => {
    try {
      const { ids } = request.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send({ error: "Invalid or empty ids array" });
      }

      // Validate that all IDs are strings
      if (!ids.every((id) => typeof id === "string")) {
        return reply.status(400).send({ error: "All IDs must be strings" });
      }

      // Delete multiple bar items using the inArray helper from drizzle-orm
      const deletedBars = await db
        .delete(bar)
        .where(inArray(bar.id, ids))
        .returning();

      return reply.send({
        success: true,
        deletedCount: deletedBars.length,
      });
    } catch (err) {
      console.error("Error in bulk delete:", err);
      return reply.status(500).send({ error: "Failed to delete bar items" });
    }
  });

  // Get bars by foo ID
  fastify.get<{ Params: { fooId: string }; Reply: Bar[] | { error: string } }>(
    "/foo/:fooId/bars",
    async (request, reply) => {
      try {
        const { fooId } = request.params;
        const bars = await db
          .select({
            id: bar.id,
            foo_id: bar.fooId,
            value: bar.value,
            label: bar.label,
            notes: bar.notes,
            is_enabled: bar.isEnabled,
            created_at: bar.createdAt,
            updated_at: bar.updatedAt,
          })
          .from(bar)
          .where(eq(bar.fooId, fooId))
          .orderBy(desc(bar.createdAt));

        return reply.send(bars);
      } catch (err) {
        console.error("Error fetching bars for foo:", err);
        return reply
          .status(500)
          .send({ error: "Failed to fetch bars for foo" });
      }
    }
  );
}
