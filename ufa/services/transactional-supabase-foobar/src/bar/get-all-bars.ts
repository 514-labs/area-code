import { eq, desc, asc, sql } from "drizzle-orm";
import { db } from "../database/connection";
import { bar, foo } from "../database/schema";
import {
  GetBarsParams,
  GetBarsResponse,
  BarWithFoo,
} from "@workspace/models/bar";

async function getAllBars(params: GetBarsParams): Promise<GetBarsResponse> {
  const limit = params.limit || 10;
  const offset = params.offset || 0;
  const sortBy = params.sortBy;
  const sortOrder = params.sortOrder || "asc";

  // Validate pagination parameters
  if (limit < 1 || limit > 100) {
    throw new Error("Limit must be between 1 and 100");
  }
  if (offset < 0) {
    throw new Error("Offset must be non-negative");
  }

  // Build query with sorting
  let orderByClause;
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
      const result = await getAllBars(request.query);
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
