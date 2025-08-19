import { ConsumptionApi } from "@514labs/moose-lib";
import { FooCurrentStateView, FooPipeline } from "../../../index";
import { GetFoosAverageScoreResponse } from "@workspace/models/foo";

// eslint-disable-next-line
type EmptyParams = {};

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
      WHERE score IS NOT NULL AND cdc_operation != 'DELETE'
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
