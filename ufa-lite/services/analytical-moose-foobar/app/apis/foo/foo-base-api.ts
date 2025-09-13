import { Api } from "@514labs/moose-lib";
import { foo, FooTable } from "../../externalModels";

export type GetFoosParams = {
  limit?: number;
  offset?: number;
  sortBy?: keyof foo;
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
};

export type GetFoosResponse = {
  data: foo[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  queryTime: number;
};

// Consumption API following Moose documentation pattern
export const fooConsumptionApi = new Api<GetFoosParams, GetFoosResponse>(
  "foo",
  async (
    {
      limit = 10,
      offset = 0,
      sortBy = "created_at",
      sortOrder = "DESC",
    }: GetFoosParams,
    { client, sql }
  ) => {
    // Convert sortOrder to uppercase for consistency
    const upperSortOrder = sql([`${sortOrder.toUpperCase()}`]);

    const countQuery = sql`
      SELECT count() as total
      FROM ${FooTable}
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
      FROM ${FooTable}
      ORDER BY ${sortBy} ${upperSortOrder}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const resultSet = await client.query.execute<foo>(query);
    const results = (await resultSet.json()) as foo[];

    const queryTime = Date.now() - startTime;

    // Create pagination metadata (matching transactional API format)
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
