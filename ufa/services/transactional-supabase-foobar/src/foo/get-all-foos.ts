import { FastifyInstance } from "fastify";
import { asc, desc, count } from "drizzle-orm";
import { db } from "../database/connection";
import { foo } from "../database/schema";
import { GetFoosParams, GetFoosResponse } from "@workspace/models/foo";
import { convertDbFooToModel } from "./foo-utils";

async function getAllFoos(params: GetFoosParams): Promise<GetFoosResponse> {
  const limit = Number(params.limit) || 10;
  const offset = Number(params.offset) || 0;

  if (limit < 1 || limit > 100) {
    throw new Error("Limit must be between 1 and 100");
  }
  if (offset < 0) {
    throw new Error("Offset must be non-negative");
  }

  const sortBy = params.sortBy;
  const sortOrder = params.sortOrder || "asc";
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

  // Get total count for pagination
  const totalCountQuery = db.select({ count: count() }).from(foo);
  const totalCountResult = await totalCountQuery;
  const total = totalCountResult[0]?.count || 0;

  const fooItemsQuery = db
    .select()
    .from(foo)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  const fooItemsFromQuery = await fooItemsQuery;

  const convertedFoo = fooItemsFromQuery.map(convertDbFooToModel);

  const queryTime = Date.now() - startTime;
  const hasMore = offset + limit < total;

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
