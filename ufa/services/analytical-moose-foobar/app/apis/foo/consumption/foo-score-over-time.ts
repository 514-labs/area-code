import { ConsumptionApi } from "@514labs/moose-lib";
import { FooPipeline } from "../../../index";
import {
  FoosScoreOverTimeDataPoint,
  GetFoosScoreOverTimeParams,
  GetFoosScoreOverTimeResponse,
} from "@workspace/models/foo";

// Score over time consumption API
export const scoreOverTimeApi = new ConsumptionApi<
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
      FROM ${FooPipeline.table!}
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

    // Fill in missing dates with zero values
    const filledData: FoosScoreOverTimeDataPoint[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const existingData = results.find((r) => r.date === dateStr);

      filledData.push({
        date: dateStr,
        averageScore: Math.round((existingData?.averageScore || 0) * 100) / 100, // Round to 2 decimal places
        totalCount: existingData?.totalCount || 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      data: filledData,
      queryTime,
    };
  }
);
