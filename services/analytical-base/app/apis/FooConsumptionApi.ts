import { ConsumptionApi } from "@514labs/moose-lib";
import { Foo } from "@workspace/models";
import { FooPipeline } from "../index";

// Define query parameters interface
interface QueryParams {
  limit?: number;
  offset?: number;
  sortBy?: keyof Foo;
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
}

// Use Foo model but replace enum with string for OpenAPI compatibility
type FooForConsumption = Omit<Foo, "status"> & { status: string };

// Interface for API response with pagination (matching transactional API)
interface FooResponse {
  data: FooForConsumption[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// Interface for average score response
interface AverageScoreResponse {
  averageScore: number;
  queryTime: number;
  count: number;
}

// Type for endpoints with no parameters
// eslint-disable-next-line
type EmptyParams = {};

// Consumption API following Moose documentation pattern
export const fooConsumptionApi = new ConsumptionApi<QueryParams, FooResponse>(
  "foo",
  async (
    {
      limit = 10,
      offset = 0,
      sortBy = "createdAt",
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

    // Build dynamic query with hardcoded table name to avoid object interpolation
    const query = sql`
      SELECT *
      FROM ${FooPipeline.table!}
      ORDER BY ${FooPipeline.columns[sortBy]!} ${upperSortOrder}
      LIMIT ${limit}
      OFFSET ${offset}
    `;


    const resultSet = await client.query.execute<Foo>(query);
    const results = (await resultSet.json()) as Foo[];

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
    };
  }
);

// New endpoint to calculate average score
export const fooAverageScoreApi = new ConsumptionApi<
  EmptyParams,
  AverageScoreResponse
>(
  "foo-average-score",
  async (
    _params: EmptyParams,
    { client, sql }
  ): Promise<AverageScoreResponse> => {
    const startTime = Date.now();

    const query = sql`
      SELECT 
        AVG(score) as averageScore,
        COUNT(*) as count
      FROM ${FooPipeline.table!}
      WHERE score IS NOT NULL
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
