import { ConsumptionApi } from "@514labs/moose-lib";
import { FooPipeline } from "../../../index";
import {
  GetFooCubeAggregationsParams,
  GetFooCubeAggregationsResponse,
} from "@workspace/models/foo";

export const fooCubeAggregationsApi = new ConsumptionApi<
  GetFooCubeAggregationsParams,
  GetFooCubeAggregationsResponse
>(
  "foo-cube-aggregations",
  async (
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
    { client, sql }
  ): Promise<GetFooCubeAggregationsResponse> => {
    const startTime = Date.now();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(
      startDate.getMonth() - Math.max(1, Math.min(months, 36))
    );

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Build optional WHERE fragments
    const statusFilter = status ? sql`AND status = ${status}` : sql``;
    const priorityFilter =
      typeof priority === "number" ? sql`AND priority = ${priority}` : sql``;

    const limited = Math.max(1, Math.min(limit, 200));
    const pagedOffset = Math.max(0, offset);

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
          return sql`avgScore`;
        case "p50":
          return sql`p50`;
        case "p90":
          return sql`p90`;
        default:
          return sql`month, status, tag, priority`;
      }
    })();
    const sortDir = sql([sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC"]);

    const query = sql`
      WITH exploded AS (
        SELECT
          toStartOfMonth(created_at) AS month,
          status,
          arrayJoin(tags) AS tag,
          priority,
          score
        FROM ${FooPipeline.table!}
        WHERE toDate(created_at) >= toDate(${startDateStr})
          AND toDate(created_at) <= toDate(${endDateStr})
          AND score IS NOT NULL
          AND cdc_operation != 'DELETE'
          ${statusFilter}
          ${priorityFilter}
      ),
      aggregated AS (
        SELECT
          CASE 
            WHEN month IS NULL THEN NULL 
            ELSE formatDateTime(month, '%Y-%m-01') 
          END AS month,
          toNullable(status) AS status,
          toNullable(tag) AS tag,
          toNullable(priority) AS priority,
          count() AS n,
          avg(score) AS avgScore,
          quantileTDigest(0.5)(score) AS p50,
          quantileTDigest(0.9)(score) AS p90
        FROM exploded
        ${tag ? sql`WHERE tag = ${tag}` : sql``}
        GROUP BY CUBE(month, status, tag, priority)
        HAVING month IS NOT NULL AND status IS NOT NULL AND tag IS NOT NULL AND priority IS NOT NULL
      )
      SELECT
        *,
        COUNT() OVER() AS total
      FROM aggregated
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT ${limited} OFFSET ${pagedOffset}
    `;

    const resultSet = await client.query.execute<{
      month: string | null;
      status: string | null;
      tag: string | null;
      priority: number | null;
      n: number;
      avgScore: number;
      p50: number;
      p90: number;
      total: number;
    }>(query);

    const rows = (await resultSet.json()) as {
      month: string | null;
      status: string | null;
      tag: string | null;
      priority: number | null;
      n: number;
      avgScore: number;
      p50: number;
      p90: number;
      total: number;
    }[];

    const queryTime = Date.now() - startTime;
    const total = rows.length > 0 ? Number(rows[0].total) : 0;

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
);
