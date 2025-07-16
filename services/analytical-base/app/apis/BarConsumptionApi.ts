import { ConsumptionApi } from "@514labs/moose-lib";
import { BarTable } from "../index";

// Interface for average value response
interface AverageValueResponse {
  averageValue: number;
  queryTime: number;
  count: number;
}

// Type for endpoints with no parameters
// eslint-disable-next-line
type EmptyParams = {};

// New endpoint to calculate average value
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
      FROM ${BarTable}
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
