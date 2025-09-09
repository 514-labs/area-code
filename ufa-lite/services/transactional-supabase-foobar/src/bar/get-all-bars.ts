import { eq, desc, asc, sql } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { getDrizzleSupabaseClient } from "../database/connection";
import { bar, foo } from "../database/schema";
import {
  GetBarsParams,
  GetBarsResponse,
  BarWithFoo,
} from "@workspace/models/bar";

async function getAllBars(
  params: GetBarsParams,
  authToken?: string
): Promise<GetBarsResponse> {
  const limit = Number(params.limit) || 10;
  const offset = Number(params.offset) || 0;

  // Validate pagination parameters
  if (limit < 1 || limit > 100) {
    throw new Error("Limit must be between 1 and 100");
  }
  if (offset < 0) {
    throw new Error("Offset must be non-negative");
  }

  // Build query with sorting
  let orderByClause;
  const sortBy = params.sortBy;
  const sortOrder = params.sortOrder || "desc";

  if (sortBy) {
    switch (sortBy) {
      case "label":
        orderByClause = sortOrder === "desc" ? desc(bar.label) : asc(bar.label);
        break;
      case "value":
        orderByClause = sortOrder === "desc" ? desc(bar.value) : asc(bar.value);
        break;
      case "is_enabled":
        orderByClause =
          sortOrder === "desc" ? desc(bar.is_enabled) : asc(bar.is_enabled);
        break;
      case "created_at":
        orderByClause =
          sortOrder === "desc" ? desc(bar.created_at) : asc(bar.created_at);
        break;
      case "updated_at":
        orderByClause =
          sortOrder === "desc" ? desc(bar.updated_at) : asc(bar.updated_at);
        break;
      default:
        orderByClause = desc(bar.created_at);
    }
  } else {
    orderByClause = desc(bar.created_at);
  }

  const startTime = Date.now();

  // Execute query with sorting and pagination using normal Drizzle query builder
  const client = await getDrizzleSupabaseClient(authToken);
  const { barItems, totalResult } = await client.runTransaction(async (tx) => {
    const barItems = await tx
      .select({
        id: bar.id,
        foo_id: bar.foo_id,
        value: bar.value,
        label: bar.label,
        notes: bar.notes,
        is_enabled: bar.is_enabled,
        created_at: bar.created_at,
        updated_at: bar.updated_at,
        foo: {
          id: foo.id,
          name: foo.name,
          description: foo.description,
          status: foo.status,
          priority: foo.priority,
          is_active: foo.is_active,
          metadata: foo.metadata,
          tags: foo.tags,
          created_at: foo.created_at,
          updated_at: foo.updated_at,
          score: foo.score,
          large_text: foo.large_text,
        },
      })
      .from(bar)
      .innerJoin(foo, eq(bar.foo_id, foo.id))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination metadata
    const totalResult = await tx
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(bar)
      .innerJoin(foo, eq(bar.foo_id, foo.id));

    return { barItems, totalResult };
  });

  const queryTime = Date.now() - startTime;

  const total = totalResult[0].count;
  const hasMore = offset + limit < total;

  return {
    data: barItems as unknown as BarWithFoo[],
    pagination: {
      limit,
      offset,
      total,
      hasMore,
    },
    queryTime,
  };
}

export function getAllBarsEndpoint(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: GetBarsParams;
    Reply: GetBarsResponse | { error: string };
  }>("/bar", async (request, reply) => {
    try {
      const authToken = request.headers.authorization?.replace("Bearer ", "");
      const result = await getAllBars(request.query, authToken);
      return reply.send(result);
    } catch (error) {
      console.error("Error fetching bars:", error);
      if (
        error instanceof Error &&
        (error.message.includes("Limit must be") ||
          error.message.includes("Offset must be"))
      ) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: "Failed to fetch bar items" });
    }
  });
}
