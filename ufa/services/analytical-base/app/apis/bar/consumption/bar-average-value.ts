import { ConsumptionApi } from "@514labs/moose-lib";
import { BarPipeline } from "../../../index";
import { GetBarsAverageValueResponse } from "@workspace/models/bar";

// Type for endpoints with no parameters
// eslint-disable-next-line
type EmptyParams = {};

export const barAverageValueApi = new ConsumptionApi<
  EmptyParams,
  GetBarsAverageValueResponse
>(
  "bar-average-value",
  async (
    _params: EmptyParams,
    { client, sql }
  ): Promise<GetBarsAverageValueResponse> => {
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
