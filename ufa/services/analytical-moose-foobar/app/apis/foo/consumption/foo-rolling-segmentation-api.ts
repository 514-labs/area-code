import { ConsumptionApi } from "@514labs/moose-lib";
import { FooPipeline } from "../../../index";
import {
  GetFooRollingSegmentationParams,
  GetFooRollingSegmentationResponse,
} from "@workspace/models/foo";

export const fooRollingSegmentationApi = new ConsumptionApi<
  GetFooRollingSegmentationParams,
  GetFooRollingSegmentationResponse
>(
  "foo-rolling-segmentation",
  async (
    params: GetFooRollingSegmentationParams,
    { client, sql }
  ): Promise<GetFooRollingSegmentationResponse> => {
    const { days = 90, windowDays = 90 } = params || {};
    const startTime = Date.now();

    // Use ClickHouse-relative dates to avoid driver param issues
    const daysRaw = sql([String(days)]);

    const windowRows = Math.max(1, Math.min(windowDays, 365)) - 1; // number of preceding rows
    const windowRowsLiteral = sql([String(windowRows)]);

    const query = sql`
      WITH exploded AS (
        SELECT
          id,
          toDate(created_at) AS d,
          status,
          arrayJoin(tags) AS tag,
          score
        FROM ${FooPipeline.table!}
        WHERE toDate(created_at) >= (today() - INTERVAL ${daysRaw} DAY)
          AND toDate(created_at) <= today()
          AND score IS NOT NULL
          AND cdc_operation != 'DELETE'
      ),
      daily AS (
        SELECT
          d,
          status,
          tag,
          avg(score) AS avg_score,
          stddevSamp(score) AS stddev_score,
          uniqExact(id) AS n_distinct_ids
        FROM exploded
        GROUP BY d, status, tag
      )
      SELECT
        d AS date,
        status,
        tag,
        round(AVG(avg_score) OVER (
          PARTITION BY status, tag
          ORDER BY d
          ROWS BETWEEN ${windowRowsLiteral} PRECEDING AND CURRENT ROW
        ), 4) AS avgScoreRolling,
        round(AVG(stddev_score) OVER (
          PARTITION BY status, tag
          ORDER BY d
          ROWS BETWEEN ${windowRowsLiteral} PRECEDING AND CURRENT ROW
        ), 4) AS volatilityRolling,
        SUM(n_distinct_ids) OVER (
          PARTITION BY status, tag
          ORDER BY d
          ROWS BETWEEN ${windowRowsLiteral} PRECEDING AND CURRENT ROW
        ) AS usersRolling
      FROM daily
      ORDER BY status, tag, date
    `;

    const resultSet = await client.query.execute<{
      date: string;
      status: string;
      tag: string;
      avgScoreRolling: number;
      volatilityRolling: number;
      usersRolling: number;
    }>(query);

    const rows = (await resultSet.json()) as {
      date: string;
      status: string;
      tag: string;
      avgScoreRolling: number;
      volatilityRolling: number;
      usersRolling: number;
    }[];

    const queryTime = Date.now() - startTime;

    return {
      data: rows.map((r) => ({
        date: r.date,
        status: r.status,
        tag: r.tag,
        avgScoreRolling: Number(r.avgScoreRolling),
        volatilityRolling: Number(r.volatilityRolling),
        usersRolling: Number(r.usersRolling),
      })),
      queryTime,
    };
  }
);
