import { FastifyInstance } from "fastify";
import { eq, desc, asc, sql } from "drizzle-orm";
import { db } from "../database/connection";
import {
  bar,
  foo,
  insertBarSchema,
  type Bar,
  type CreateBar,
  type UpdateBar,
} from "../database/schema";

export async function barRoutes(fastify: FastifyInstance) {
  // Get all bar items with pagination and sorting
  fastify.get<{
    Querystring: {
      limit?: string;
      offset?: string;
      sortBy?: string;
      sortOrder?: string;
    };
    Reply:
      | {
          data: any[];
          pagination: {
            limit: number;
            offset: number;
            total: number;
            hasMore: boolean;
          };
        }
      | { error: string };
  }>("/bar", async (request, reply) => {
    try {
      const limit = parseInt(request.query.limit || "10");
      const offset = parseInt(request.query.offset || "0");
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
          case "isEnabled":
            orderByClause =
              sortOrder === "desc" ? desc(bar.isEnabled) : asc(bar.isEnabled);
            break;
          case "createdAt":
            orderByClause =
              sortOrder === "desc" ? desc(bar.createdAt) : asc(bar.createdAt);
            break;
          case "updatedAt":
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

      // Execute query with sorting and pagination
      const barItems = await db
        .select({
          id: bar.id,
          fooId: bar.fooId,
          value: bar.value,
          label: bar.label,
          notes: bar.notes,
          isEnabled: bar.isEnabled,
          createdAt: bar.createdAt,
          updatedAt: bar.updatedAt,
          foo: {
            id: foo.id,
            name: foo.name,
            description: foo.description,
            status: foo.status,
          },
        })
        .from(bar)
        .leftJoin(foo, eq(bar.fooId, foo.id))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination metadata
      const totalResult = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(bar);

      const total = totalResult[0].count;
      const hasMore = offset + limit < total;

      return reply.send({
        data: barItems,
        pagination: {
          limit,
          offset,
          total,
          hasMore,
        },
      });
    } catch (error) {
      console.error("Error fetching bars:", error);
      return reply.status(500).send({ error: "Failed to fetch bar items" });
    }
  });

  // Get bar by ID with foo details
  fastify.get<{ Params: { id: string }; Reply: any | { error: string } }>(
    "/bar/:id",
    async (request, reply) => {
      try {
        const { id } = request.params;

        const barWithFoo = await db
          .select({
            id: bar.id,
            fooId: bar.fooId,
            value: bar.value,
            label: bar.label,
            notes: bar.notes,
            isEnabled: bar.isEnabled,
            createdAt: bar.createdAt,
            updatedAt: bar.updatedAt,
            foo: {
              id: foo.id,
              name: foo.name,
              description: foo.description,
              status: foo.status,
            },
          })
          .from(bar)
          .leftJoin(foo, eq(bar.fooId, foo.id))
          .where(eq(bar.id, id))
          .limit(1);

        if (barWithFoo.length === 0) {
          return reply.status(404).send({ error: "Bar not found" });
        }

        return reply.send(barWithFoo[0]);
      } catch (error) {
        console.error("Error fetching bar:", error);
        return reply.status(500).send({ error: "Failed to fetch bar" });
      }
    }
  );

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

        const newBar = await db.insert(bar).values(validatedData).returning();

        return reply.status(201).send(newBar[0]);
      } catch (error) {
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
      const updateData = { ...request.body, updatedAt: new Date() };

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
        .returning();

      if (updatedBar.length === 0) {
        return reply.status(404).send({ error: "Bar not found" });
      }

      return reply.send(updatedBar[0]);
    } catch (error) {
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
    } catch (error) {
      return reply.status(500).send({ error: "Failed to delete bar" });
    }
  });

  // Get bars by foo ID
  fastify.get<{ Params: { fooId: string }; Reply: Bar[] | { error: string } }>(
    "/foo/:fooId/bars",
    async (request, reply) => {
      try {
        const { fooId } = request.params;
        const bars = await db
          .select()
          .from(bar)
          .where(eq(bar.fooId, fooId))
          .orderBy(desc(bar.createdAt));

        return reply.send(bars);
      } catch (error) {
        return reply
          .status(500)
          .send({ error: "Failed to fetch bars for foo" });
      }
    }
  );
}
