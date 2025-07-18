import { ConsumptionApi } from "@514labs/moose-lib";
import { Foo, FooWithCDC } from "@workspace/models";
import { FooPipeline } from "../index";

// Define query parameters interface
interface QueryParams {
  limit?: number;
  offset?: number;
  sortBy?: keyof Foo | "cdc_operation" | "cdc_timestamp";
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
}

// Use FooWithCDC but replace enum with string for OpenAPI compatibility
type FooForConsumption = Omit<FooWithCDC, "status"> & {
  status: string;
};

// Interface for API response with pagination (matching transactional API)
interface FooResponse {
  data: FooForConsumption[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  queryTime: number;
}

// Interface for average score response
interface AverageScoreResponse {
  averageScore: number;
  queryTime: number;
  count: number;
}

// Type for endpoints with no parameters
// eslint-disable-next-line
type EmptyParams = {};

// Consumption API following Moose documentation pattern
export const fooConsumptionApi = new ConsumptionApi<QueryParams, FooResponse>(
  "foo",
  async (
    {
      limit = 10,
      offset = 0,
      sortBy = "cdc_timestamp",
      sortOrder = "DESC",
    }: QueryParams,
    { client, sql }
  ) => {
    // Convert sortOrder to uppercase for consistency
    const upperSortOrder = sql([`${sortOrder.toUpperCase()}`]);

    const countQuery = sql`
      SELECT count() as total
      FROM ${FooPipeline.table!}
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
      SELECT *,
             cdc_id,
             cdc_operation,
             cdc_timestamp
      FROM ${FooPipeline.table!}
      ORDER BY ${sortBy === "cdc_operation" || sortBy === "cdc_timestamp" ? sql([sortBy]) : FooPipeline.columns[sortBy as keyof Foo]!} ${upperSortOrder}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const resultSet = await client.query.execute<FooForConsumption>(query);
    const results = (await resultSet.json()) as FooForConsumption[];

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

// New endpoint to calculate average score
export const fooAverageScoreApi = new ConsumptionApi<
  EmptyParams,
  AverageScoreResponse
>(
  "foo-average-score",
  async (
    _params: EmptyParams,
    { client, sql }
  ): Promise<AverageScoreResponse> => {
    const startTime = Date.now();

    const query = sql`
      SELECT 
        AVG(score) as averageScore,
        COUNT(*) as count
      FROM ${FooPipeline.table!}
      WHERE score IS NOT NULL
    `;

    const resultSet = await client.query.execute<{
      averageScore: number;
      count: number;
    }>(query);

    const result = (await resultSet.json()) as {
      averageScore: number;
      count: number;
    }[];
    const queryTime = Date.now() - startTime;

    return {
      averageScore: result[0].averageScore,
      queryTime,
      count: result[0].count,
    };
  }
);

// New endpoint to get CDC operation statistics
export const fooCdcStatsApi = new ConsumptionApi<
  EmptyParams,
  { operationCounts: Record<string, number>; queryTime: number }
>("foo-cdc-stats", async (_params: EmptyParams, { client, sql }) => {
  const startTime = Date.now();

  const query = sql`
      SELECT 
        cdc_operation,
        COUNT(*) as count
      FROM ${FooPipeline.table!}
      WHERE cdc_operation IS NOT NULL
      GROUP BY cdc_operation
    `;

  const resultSet = await client.query.execute<{
    cdc_operation: string;
    count: number;
  }>(query);

  const results = (await resultSet.json()) as {
    cdc_operation: string;
    count: number;
  }[];

  const operationCounts = results.reduce(
    (acc, row) => {
      acc[row.cdc_operation] = row.count;
      return acc;
    },
    {} as Record<string, number>
  );

  const queryTime = Date.now() - startTime;

  return {
    operationCounts,
    queryTime,
  };
});
