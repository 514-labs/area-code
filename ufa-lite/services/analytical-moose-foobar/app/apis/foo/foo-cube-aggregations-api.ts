import { Api } from "@514labs/moose-lib";
import { FooTable } from "../../externalModels";

export type GetFooCubeAggregationsParams = {
  months?: number;
  status?: string;
  tag?: string;
  priority?: number;
  limit?: number;
  offset?: number;
  sortBy?:
    | "month"
    | "status"
    | "tag"
    | "priority"
    | "n"
    | "avgScore"
    | "p50"
    | "p90";
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
};

export type FooCubeAggregationRow = {
  month: string | null;
  status: string | null;
  tag: string | null;
  priority: number | null;
  n: number;
  avgScore: number;
  p50: number;
  p90: number;
};

export type GetFooCubeAggregationsResponse = {
  data: FooCubeAggregationRow[];
  queryTime: number;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export const fooCubeAggregationsApi = new Api<
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
      SELECT
        formatDateTime(toStartOfMonth(created_at), '%Y-%m-01') AS month,
        status,
        arrayJoin(tags) AS tag,
        priority,
        count() AS n,
        avg(score) AS avgScore,
        quantileTDigest(0.5)(toFloat64(score)) AS p50,
        quantileTDigest(0.9)(toFloat64(score)) AS p90,
        COUNT() OVER() AS total
      FROM ${FooTable}
      WHERE toDate(created_at) >= toDate(${startDateStr})
        AND toDate(created_at) <= toDate(${endDateStr})
        AND score IS NOT NULL
        ${statusFilter}
        ${priorityFilter}
      GROUP BY month, status, tag, priority
      ${tag ? sql`HAVING tag = ${tag}` : sql``}
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
