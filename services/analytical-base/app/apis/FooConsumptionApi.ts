import { ConsumptionApi } from "@514labs/moose-lib";
import { Foo } from "@workspace/models";
import { FooThingEventPipeline } from "../pipelines/eventsPipeline";

// Define query parameters interface
interface QueryParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
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
    const fooTableName = FooThingEventPipeline.table!;

    // Convert sortOrder to uppercase for consistency
    const upperSortOrder = sortOrder.toUpperCase() as "ASC" | "DESC";

    // First, get the total count of all records
    const countQuery = sql`
      SELECT count() as total
      FROM ${fooTableName}
    `;

    const countResultSet = await client.query.execute<{
      total: number;
    }>(countQuery);
    const countResults = (await countResultSet.json()) as {
      total: number;
    }[];
    const totalCount = countResults[0]?.total || 0;

    // this is the only way I found to make sort order work within moose....
    const query =
      upperSortOrder === "ASC"
        ? sql`
          SELECT params.currentData
          FROM ${fooTableName}
          ORDER BY params.currentData.${sortBy} ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `
        : sql`
          SELECT params.currentData
          FROM ${fooTableName}
          ORDER BY params.currentData.${sortBy} DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;

    const resultSet = await client.query.execute<{
      "params.currentData": [[Foo]];
    }>(query);
    const results = (await resultSet.json()) as {
      "params.currentData": [[Foo]];
    }[];

    // Extract and convert the Foo objects to FooForConsumption for OpenAPI compatibility
    const data = results.map((row) => {
      const fooData = row["params.currentData"][0][0];
      return {
        ...fooData,
        status: fooData.status.toString(),
      };
    });

    // Create pagination metadata (matching transactional API format)
    const hasMore = offset + data.length < totalCount;

    return {
      data,
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
    const fooTableName = FooThingEventPipeline.table!;
    const startTime = Date.now();

    const query = sql`
      SELECT 
        AVG(toFloat64(params.currentData[1][1].score)) as averageScore,
        COUNT(*) as count
      FROM ${fooTableName}
      WHERE params.currentData[1][1].score IS NOT NULL
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
