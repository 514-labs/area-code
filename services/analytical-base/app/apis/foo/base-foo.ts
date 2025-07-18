import { ConsumptionApi } from "@514labs/moose-lib";
import { Foo, FooWithCDC } from "@workspace/models";
import { FooPipeline } from "../../index";

// Define query parameters interface
interface QueryParams {
  limit?: number;
  offset?: number;
  sortBy?: keyof Foo | "cdc_operation" | "cdc_timestamp";
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
}

// Use FooWithCDC but replace enum with string for OpenAPI compatibility
type FooForConsumption = Omit<FooWithCDC, "status"> & {
  status: string;
};

// Interface for API response with pagination (matching transactional API)
interface FooResponse {
  data: FooForConsumption[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  queryTime: number;
}

// Consumption API following Moose documentation pattern
export const fooConsumptionApi = new ConsumptionApi<QueryParams, FooResponse>(
  "foo",
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
      FROM ${FooPipeline.table!}
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
      FROM ${FooPipeline.table!}
      ORDER BY ${sortBy === "cdc_operation" || sortBy === "cdc_timestamp" ? sql([sortBy]) : FooPipeline.columns[sortBy as keyof Foo]!} ${upperSortOrder}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const resultSet = await client.query.execute<FooForConsumption>(query);
    const results = (await resultSet.json()) as FooForConsumption[];

    const queryTime = Date.now() - startTime;

    // Create pagination metadata (matching transactional API format)
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
