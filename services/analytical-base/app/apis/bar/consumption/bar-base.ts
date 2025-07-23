import { ConsumptionApi } from "@514labs/moose-lib";
import { Bar, BarWithCDC } from "@workspace/models";
import { BarPipeline } from "../../../index";

type BarForConsumption = BarWithCDC;

interface QueryParams {
  limit?: number;
  offset?: number;
  sortBy?: keyof Bar | "cdc_operation" | "cdc_timestamp";
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
}

interface BarResponse {
  data: BarForConsumption[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  queryTime: number;
}

// Consumption API for Bar data with CDC information
export const barConsumptionApi = new ConsumptionApi<QueryParams, BarResponse>(
  "bar",
  async (
    {
      limit = 10,
      offset = 0,
      sortBy = "cdc_timestamp",
      sortOrder = "DESC",
    }: QueryParams,
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
      ORDER BY ${sortBy === "cdc_operation" || sortBy === "cdc_timestamp" ? sql([sortBy]) : BarPipeline.columns[sortBy as keyof Bar]!} ${upperSortOrder}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const resultSet = await client.query.execute<BarForConsumption>(query);
    const results = (await resultSet.json()) as BarForConsumption[];

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
