import { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { getDrizzleSupabaseClient } from "../database/connection";
import { foo } from "../database/schema";
import {
  GetFoosScoreOverTimeParams,
  GetFoosScoreOverTimeResponse,
} from "@workspace/models/foo";

async function getFooScoreOverTime(
  params: GetFoosScoreOverTimeParams,
  authToken?: string
): Promise<GetFoosScoreOverTimeResponse> {
  const days = params.days || 90;

  // Validate days parameter
  if (days < 1 || days > 365) {
    throw new Error("Days must be between 1 and 365");
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
  const client = await getDrizzleSupabaseClient(authToken);
  const result = await client.runTransaction(async (tx) => {
    return await tx
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
  });

  const endTime = Date.now();
  const queryTime = endTime - startTime;

  const data = result.map((row) => ({
    date: row.date,
    averageScore: Math.round(Number(row.averageScore) * 100) / 100, // Round to 2 decimal places
    totalCount: Number(row.totalCount),
  }));

  return {
    data,
    queryTime,
  };
}

export function getFooScoreOverTimeEndpoint(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: GetFoosScoreOverTimeParams;
    Reply: GetFoosScoreOverTimeResponse | { error: string };
  }>("/foo/score-over-time", async (request, reply) => {
    try {
      const authToken = request.headers.authorization?.replace("Bearer ", "");
      const result = await getFooScoreOverTime(request.query, authToken);
      return reply.send(result);
    } catch (error) {
      console.error("Error calculating score over time:", error);
      if (
        error instanceof Error &&
        error.message === "Days must be between 1 and 365"
      ) {
        return reply.status(400).send({ error: error.message });
      }
      return reply
        .status(500)
        .send({ error: "Failed to calculate score over time" });
    }
  });
}
