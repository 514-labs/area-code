import { FastifyInstance } from "fastify";
import { sql, asc, desc } from "drizzle-orm";
import { db } from "../database/connection";
import { foo } from "../database/schema";
import { GetFoosParams, GetFoosResponse } from "@workspace/models/foo";
import { convertDbFooToModel } from "./foo-utils";

async function getAllFoos(params: GetFoosParams): Promise<GetFoosResponse> {
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

  // Build query with sorting - simplified approach
  let orderByClause;
  if (sortBy) {
    switch (sortBy) {
      case "name":
        orderByClause = sortOrder === "desc" ? desc(foo.name) : asc(foo.name);
        break;
      case "description":
        orderByClause =
          sortOrder === "desc" ? desc(foo.description) : asc(foo.description);
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
          sortOrder === "desc" ? desc(foo.is_active) : asc(foo.is_active);
        break;
      case "score":
        orderByClause = sortOrder === "desc" ? desc(foo.score) : asc(foo.score);
        break;
      case "created_at":
        orderByClause =
          sortOrder === "desc" ? desc(foo.created_at) : asc(foo.created_at);
        break;
      case "updated_at":
        orderByClause =
          sortOrder === "desc" ? desc(foo.updated_at) : asc(foo.updated_at);
        break;
      default:
        // Default sorting by created_at desc for invalid sortBy
        orderByClause = desc(foo.created_at);
    }
  } else {
    // Default sorting by created_at desc
    orderByClause = desc(foo.created_at);
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

  const convertedFoo = fooItems.map(convertDbFooToModel);

  return {
    data: convertedFoo,
    pagination: {
      limit,
      offset,
      total,
      hasMore,
    },
    queryTime,
  };
}

export function getAllFoosEndpoint(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: GetFoosParams;
    Reply: GetFoosResponse | { error: string };
  }>("/foo", async (request, reply) => {
    try {
      const result = await getAllFoos(request.query);
      return reply.send(result);
    } catch (error) {
      console.error("Error fetching foo items:", error);
      if (
        error instanceof Error &&
        (error.message.includes("Limit must be") ||
          error.message.includes("Offset must be"))
      ) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: "Failed to fetch foo items" });
    }
  });
}
