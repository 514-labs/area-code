import { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { getDrizzleSupabaseClient } from "../database/connection";
import { bar } from "../database/schema";
import { GetBarsAverageValueResponse } from "@workspace/models/bar";

async function getBarAverageValue(
  authToken?: string
): Promise<GetBarsAverageValueResponse> {
  const startTime = Date.now();

  // Get average value and count
  const client = await getDrizzleSupabaseClient(authToken);
  const result = await client.runTransaction(async (tx) => {
    return await tx
      .select({
        averageValue: sql<number>`AVG(CAST(value AS DECIMAL))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(bar);
  });

  const endTime = Date.now();
  const queryTime = endTime - startTime;

  const averageValue = result[0]?.averageValue || 0;
  const count = result[0]?.count || 0;

  return {
    averageValue: Number(averageValue),
    queryTime,
    count,
  };
}

export function getBarAverageValueEndpoint(fastify: FastifyInstance) {
  fastify.get<{
    Reply: GetBarsAverageValueResponse | { error: string };
  }>("/bar/average-value", async (request, reply) => {
    try {
      const authToken = request.headers.authorization?.replace("Bearer ", "");
      const result = await getBarAverageValue(authToken);
      return reply.send(result);
    } catch (error) {
      console.error("Error calculating average value:", error);
      return reply
        .status(500)
        .send({ error: "Failed to calculate average value" });
    }
  });
}
