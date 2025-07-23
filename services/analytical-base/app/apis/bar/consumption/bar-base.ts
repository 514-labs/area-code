import { ConsumptionApi } from "@514labs/moose-lib";
import {
  BarWithCDC,
  GetBarsWithCDCParams,
  GetBarsWithCDCResponse,
} from "@workspace/models/bar";
import { BarPipeline } from "../../../index";

export const barConsumptionApi = new ConsumptionApi<
  GetBarsWithCDCParams,
  GetBarsWithCDCResponse
>(
  "bar",
  async (
    {
      limit = 10,
      offset = 0,
      sortBy = "cdc_timestamp",
      sortOrder = "DESC",
    }: GetBarsWithCDCParams,
    { client, sql }
  ) => {
    // Convert sortOrder to uppercase for consistency
    const upperSortOrder = sql([`${sortOrder.toUpperCase()}`]);

    const countQuery = sql`
      SELECT count() as total
      FROM ${BarPipeline.table!}
    `;

    const countResultSet = await client.query.execute<{
      total: number;
    }>(countQuery);
    const countResults = (await countResultSet.json()) as {
      total: number;
    }[];
    const totalCount = countResults[0]?.total || 0;

    const startTime = Date.now();

    // Build dynamic query including CDC fields
    const query = sql`
      SELECT *,
             cdc_id,
             cdc_operation,
             cdc_timestamp
      FROM ${BarPipeline.table!}
      ORDER BY ${sortBy === "cdc_operation" || sortBy === "cdc_timestamp" ? sql([sortBy]) : BarPipeline.columns[sortBy as keyof BarWithCDC]!} ${upperSortOrder}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const resultSet = await client.query.execute<BarWithCDC>(query);
    const results = (await resultSet.json()) as BarWithCDC[];

    const queryTime = Date.now() - startTime;

    // Create pagination metadata
    const hasMore = offset + results.length < totalCount;

    return {
      data: results,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore,
      },
      queryTime,
    };
  }
);
