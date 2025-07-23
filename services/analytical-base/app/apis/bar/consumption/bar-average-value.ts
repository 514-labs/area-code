import { ConsumptionApi } from "@514labs/moose-lib";
import { BarPipeline } from "../../../index";

// Interface for average value response
interface AverageValueResponse {
  averageValue: number;
  queryTime: number;
  count: number;
}

// Type for endpoints with no parameters
// eslint-disable-next-line
type EmptyParams = {};

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
