import { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { getDrizzleSupabaseClient } from "../database/connection";
import { foo } from "../database/schema";
import {
  GetFooCubeAggregationsParams,
  GetFooCubeAggregationsResponse,
} from "@workspace/models/foo";

async function getFooCubeAggregations(
  {
    months = 6,
    status,
    tag,
    priority,
    limit = 20,
    offset = 0,
    sortBy,
    sortOrder = "ASC",
  }: GetFooCubeAggregationsParams,
  authToken?: string
): Promise<GetFooCubeAggregationsResponse> {
  const startTime = Date.now();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - Math.max(1, Math.min(months, 36)));

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  const limited = Math.max(1, Math.min(limit, 200));
  const pagedOffset = Math.max(0, offset);

  // Build WHERE conditions
  const conditions = [
    sql`created_at >= ${startDateStr}::date`,
    sql`created_at <= ${endDateStr}::date`,
    sql`score IS NOT NULL`,
  ];

  if (status) {
    conditions.push(sql`status = ${status}`);
  }

  if (typeof priority === "number") {
    conditions.push(sql`priority = ${priority}`);
  }

  // Map sort column safely
  const sortColumn = (() => {
    switch (sortBy) {
      case "month":
        return sql`month`;
      case "status":
        return sql`status`;
      case "tag":
        return sql`tag`;
      case "priority":
        return sql`priority`;
      case "n":
        return sql`n`;
      case "avgScore":
        return sql`"avgScore"`;
      case "p50":
        return sql`p50`;
      case "p90":
        return sql`p90`;
      default:
        return sql`month, status, tag, priority`;
    }
  })();

  const sortDir = sortOrder.toUpperCase() === "DESC" ? sql`DESC` : sql`ASC`;
  const whereClause = sql.join(conditions, sql` AND `);

  const client = await getDrizzleSupabaseClient(authToken);

  const result = await client.runTransaction(async (tx) => {
    // Optimization: Single query with conditional tag filtering (matching ClickHouse version)
    return await tx.execute(sql`
      SELECT
        to_char(date_trunc('month', created_at), 'YYYY-MM-01') AS month,
        status,
        unnest(tags) AS tag,
        priority,
        count(*) AS n,
        avg(CAST(score AS DECIMAL)) AS "avgScore",
        percentile_cont(0.5) WITHIN GROUP (ORDER BY CAST(score AS DECIMAL)) AS p50,
        percentile_cont(0.9) WITHIN GROUP (ORDER BY CAST(score AS DECIMAL)) AS p90,
        COUNT(*) OVER() AS total
      FROM ${foo}
      WHERE ${whereClause}
      GROUP BY month, status, tag, priority
      ${tag ? sql`HAVING tag = ${tag}` : sql``}
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT ${limited} OFFSET ${pagedOffset}
    `);
  });

  const rows = result as unknown as {
    month: string | null;
    status: string | null;
    tag: string | null;
    priority: number | null;
    n: string;
    avgScore: string;
    p50: string;
    p90: string;
    total: string;
  }[];

  const total = rows.length > 0 ? Number(rows[0].total) : 0;

  const queryTime = Date.now() - startTime;

  return {
    data: rows.map((r) => ({
      month: r.month,
      status: r.status,
      tag: r.tag,
      priority: r.priority === null ? null : Number(r.priority),
      n: Number(r.n),
      avgScore: Number(r.avgScore),
      p50: Number(r.p50),
      p90: Number(r.p90),
    })),
    queryTime,
    pagination: {
      limit: limited,
      offset: pagedOffset,
      total,
    },
  };
}

export function getFooCubeAggregationsEndpoint(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: GetFooCubeAggregationsParams & { includeTotals?: boolean };
    Reply: GetFooCubeAggregationsResponse | { error: string };
  }>("/foo/cube-aggregations", async (request, reply) => {
    try {
      const authToken = request.headers.authorization?.replace("Bearer ", "");
      const rawParams = request.query as any;

      // Convert string parameters to proper types
      const params: GetFooCubeAggregationsParams = {
        months: rawParams.months ? Number(rawParams.months) : undefined,
        status: rawParams.status || undefined,
        tag: rawParams.tag || undefined,
        priority: rawParams.priority ? Number(rawParams.priority) : undefined,
        limit: rawParams.limit ? Number(rawParams.limit) : undefined,
        offset: rawParams.offset ? Number(rawParams.offset) : undefined,
        sortBy: rawParams.sortBy || undefined,
        sortOrder: rawParams.sortOrder || undefined,
      };

      const result = await getFooCubeAggregations(params, authToken);
      return reply.send(result);
    } catch (error) {
      console.error("Error getting cube aggregations:", error);
      return reply
        .status(500)
        .send({ error: "Failed to get cube aggregations" });
    }
  });
}
