import { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { getDrizzleSupabaseClient } from "../database/connection";
import { foo } from "../database/schema";
import { GetFoosAverageScoreResponse } from "@workspace/models/foo";

async function getFooAverageScore(
  authToken?: string
): Promise<GetFoosAverageScoreResponse> {
  const startTime = Date.now();

  // Get average score and count
  const client = await getDrizzleSupabaseClient(authToken);
  const result = await client.runTransaction(async (tx) => {
    return await tx
      .select({
        averageScore: sql<number>`AVG(CAST(score AS DECIMAL))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(foo);
  });

  const endTime = Date.now();
  const queryTime = endTime - startTime;

  const averageScore = result[0]?.averageScore || 0;
  const count = result[0]?.count || 0;

  return {
    averageScore: Number(averageScore),
    queryTime,
    count,
  };
}

export function getFooAverageScoreEndpoint(fastify: FastifyInstance) {
  fastify.get<{
    Reply: GetFoosAverageScoreResponse | { error: string };
  }>("/foo/average-score", async (request, reply) => {
    try {
      const authToken = request.headers.authorization?.replace("Bearer ", "");

      const result = await getFooAverageScore(authToken);
      return reply.send(result);
    } catch (error) {
      console.error("Error calculating average score:", error);
      return reply
        .status(500)
        .send({ error: "Failed to calculate average score" });
    }
  });
}
