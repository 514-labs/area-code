import { ConsumptionApi } from "@514labs/moose-lib";
import { FooPipeline } from "../../../index";
import { GetFoosAverageScoreResponse } from "@workspace/models/foo";

// Type for endpoints with no parameters
// eslint-disable-next-line
type EmptyParams = {};

// New endpoint to calculate average score
export const fooAverageScoreApi = new ConsumptionApi<
  EmptyParams,
  GetFoosAverageScoreResponse
>(
  "foo-average-score",
  async (
    _params: EmptyParams,
    { client, sql }
  ): Promise<GetFoosAverageScoreResponse> => {
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
