import { ConsumptionApi } from "@514labs/moose-lib";
import { Bar, BarWithCDC } from "@workspace/models";
import { BarPipeline } from "../index";

// Define query parameters interface
interface QueryParams {
  limit?: number;
  offset?: number;
  sortBy?: keyof Bar | "cdc_operation" | "cdc_timestamp";
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
}

// Bar with CDC fields for consumption
type BarForConsumption = BarWithCDC;

// Interface for API response with pagination
interface BarResponse {
  data: BarForConsumption[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  queryTime: number;
}

// Interface for average value response
interface AverageValueResponse {
  averageValue: number;
  queryTime: number;
  count: number;
}

// Type for endpoints with no parameters
// eslint-disable-next-line
type EmptyParams = {};

// Consumption API for Bar data with CDC information
export const barConsumptionApi = new ConsumptionApi<QueryParams, BarResponse>(
  "bar",
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
      FROM ${BarPipeline.table!}
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
      FROM ${BarPipeline.table!}
      ORDER BY ${sortBy === "cdc_operation" || sortBy === "cdc_timestamp" ? sql([sortBy]) : BarPipeline.columns[sortBy as keyof Bar]!} ${upperSortOrder}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const resultSet = await client.query.execute<BarForConsumption>(query);
    const results = (await resultSet.json()) as BarForConsumption[];

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

// Endpoint to calculate average value
export const barAverageValueApi = new ConsumptionApi<
  EmptyParams,
  AverageValueResponse
>(
  "bar-average-value",
  async (
    _params: EmptyParams,
    { client, sql }
  ): Promise<AverageValueResponse> => {
    const startTime = Date.now();

    const query = sql`
      SELECT 
        AVG(value) as averageValue,
        COUNT(*) as count
      FROM ${BarPipeline.table!}
      WHERE value IS NOT NULL
    `;

    const resultSet = await client.query.execute<{
      averageValue: number;
      count: number;
    }>(query);

    const result = (await resultSet.json()) as {
      averageValue: number;
      count: number;
    }[];
    const queryTime = Date.now() - startTime;

    return {
      averageValue: result[0].averageValue,
      queryTime,
      count: result[0].count,
    };
  }
);

// New endpoint to get CDC operation statistics
export const barCdcStatsApi = new ConsumptionApi<
  EmptyParams,
  { operationCounts: Record<string, number>; queryTime: number }
>("bar-cdc-stats", async (_params: EmptyParams, { client, sql }) => {
  const startTime = Date.now();

  const query = sql`
      SELECT 
        cdc_operation,
        COUNT(*) as count
      FROM ${BarPipeline.table!}
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
