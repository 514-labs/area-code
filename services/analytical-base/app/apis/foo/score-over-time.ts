import { ConsumptionApi } from "@514labs/moose-lib";
import { FooPipeline } from "../../index";

// Define query parameters interface
interface ScoreOverTimeParams {
  days?: number; // Number of days to look back (default: 90)
}

// Interface for chart data point
interface ChartDataPoint {
  date: string;
  averageScore: number;
  totalCount: number;
}

// Interface for API response
interface ChartDataResponse {
  data: ChartDataPoint[];
  dbQueryTime?: number;
}

// Score over time consumption API
export const scoreOverTimeApi = new ConsumptionApi<
  ScoreOverTimeParams,
  ChartDataResponse
>(
  "foo-score-over-time",
  async (
    { days = 90 }: ScoreOverTimeParams,
    { client, sql }
  ): Promise<ChartDataResponse> => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const endDate = new Date();

    // Format dates for SQL
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Query to get daily score aggregations
    const query = sql`
      SELECT 
        toDate(createdAt) as date,
        AVG(score) as averageScore,
        COUNT(*) as totalCount
      FROM ${FooPipeline.table!}
      WHERE toDate(createdAt) >= toDate(${startDateStr})
        AND toDate(createdAt) <= toDate(${endDateStr})
        AND score IS NOT NULL
      GROUP BY toDate(createdAt)
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

    const endTime = Date.now();
    const dbQueryTime = endTime - startTime;

    // Fill in missing dates with zero values
    const filledData: ChartDataPoint[] = [];
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
      dbQueryTime,
    };
  }
);
