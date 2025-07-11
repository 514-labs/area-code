import { ConsumptionApi } from "@514labs/moose-lib";
import { Foo } from "@workspace/models";
import { FooThingEventPipeline } from "../pipelines/eventsPipeline";

// Define query parameters interface
interface QueryParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

// Use Foo model but replace enum with string for OpenAPI compatibility
type FooForConsumption = Omit<Foo, "status"> & { status: string };

// Interface for average score response
interface AverageScoreResponse {
  averageScore: number;
  queryTime: number;
  count: number;
}

// Type for endpoints with no parameters
type EmptyParams = {};

// Consumption API following Moose documentation pattern
export const fooConsumptionApi = new ConsumptionApi<
  QueryParams,
  FooForConsumption[]
>(
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

    // this is the only way I found to make sort order work....
    const query =
      sortOrder === "ASC"
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

    const resultSet = await client.query.execute<FooForConsumption>(query);
    return await resultSet.json();
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
