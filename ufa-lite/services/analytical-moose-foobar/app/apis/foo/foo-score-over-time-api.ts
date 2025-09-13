import { Api } from "@514labs/moose-lib";

export type FoosScoreOverTimeDataPoint = {
  date: string;
  averageScore: number;
  totalCount: number;
};

export type GetFoosScoreOverTimeParams = {
  days?: number;
};

export type GetFoosScoreOverTimeResponse = {
  data: FoosScoreOverTimeDataPoint[];
  queryTime: number;
};

// Score over time consumption API
export const scoreOverTimeApi = new Api<
  GetFoosScoreOverTimeParams,
  GetFoosScoreOverTimeResponse
>(
  "foo-score-over-time",
  async (
    { days = 90 }: GetFoosScoreOverTimeParams,
    { client, sql }
  ): Promise<GetFoosScoreOverTimeResponse> => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const endDate = new Date();

    // Format dates for SQL
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Query to get daily score aggregations
    const query = sql`
      SELECT 
        toDate(created_at) as date,
        AVG(score) as averageScore,
        COUNT(*) as totalCount
      FROM foo
      WHERE toDate(created_at) >= toDate(${startDateStr})
        AND toDate(created_at) <= toDate(${endDateStr})
        AND score IS NOT NULL
      GROUP BY toDate(created_at)
      ORDER BY date ASC
    `;

    const startTime = Date.now();

    const resultSet = await client.query.execute<{
      date: string;
      averageScore: number;
      totalCount: number;
    }>(query);

    const results = (await resultSet.json()) as {
      date: string;
      averageScore: number;
      totalCount: number;
    }[];

    const queryTime = Date.now() - startTime;

    const data: FoosScoreOverTimeDataPoint[] = results.map((result) => ({
      date: result.date,
      averageScore: Math.round(result.averageScore * 100) / 100, // Round to 2 decimal places
      totalCount: result.totalCount,
    }));

    return {
      data,
      queryTime,
    };
  }
);
