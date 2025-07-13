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
