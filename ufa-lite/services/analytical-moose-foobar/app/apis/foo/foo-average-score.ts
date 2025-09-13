import { Api } from "@514labs/moose-lib";
import { FooTable } from "../../externalModels";

// eslint-disable-next-line
type EmptyParams = {};

export type GetFoosAverageScoreResponse = {
  averageScore: number;
  count: number;
  queryTime: number;
};

export const fooAverageScoreApi = new Api<
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
        AVG(${FooTable.columns.score}) as averageScore,
        COUNT(*) as count
      FROM ${FooTable}
      WHERE ${FooTable.columns._peerdb_is_deleted} != 1
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
