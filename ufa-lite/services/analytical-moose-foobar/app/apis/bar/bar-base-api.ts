import { Api } from "@514labs/moose-lib";
import { bar, BarTable } from "../../externalModels";

export type GetBarsParams = {
  limit?: number;
  offset?: number;
  sortBy?: keyof bar;
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
};

export type GetBarsResponse = {
  data: bar[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  queryTime: number;
};

export const barConsumptionApi = new Api<GetBarsParams, GetBarsResponse>(
  "bar",
  async (
    {
      limit = 10,
      offset = 0,
      sortBy = "created_at",
      sortOrder = "DESC",
    }: GetBarsParams,
    { client, sql }
  ) => {
    // Convert sortOrder to uppercase for consistency
    const upperSortOrder = sql([`${sortOrder.toUpperCase()}`]);

    const countQuery = sql`
      SELECT count() as total
      FROM ${BarTable}
    `;

    const countResultSet = await client.query.execute<{
      total: number;
    }>(countQuery);
    const countResults = (await countResultSet.json()) as {
      total: number;
    }[];
    const totalCount = countResults[0]?.total || 0;

    const startTime = Date.now();

    // Build dynamic query including CDC fields
    const query = sql`
      SELECT *
      FROM ${BarTable}
      ORDER BY ${sortBy} ${upperSortOrder}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const resultSet = await client.query.execute<bar>(query);
    const results = (await resultSet.json()) as bar[];

    const queryTime = Date.now() - startTime;

    // Create pagination metadata
    const hasMore = offset + results.length < totalCount;

    return {
      data: results,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore,
      },
      queryTime,
    };
  }
);
