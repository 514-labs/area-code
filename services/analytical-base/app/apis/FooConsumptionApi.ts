import { ConsumptionApi, ConsumptionHelpers } from "@514labs/moose-lib";
import { Foo, FooThingEvent } from "@workspace/models";
import { FooThingEventPipeline } from "../pipelines/eventsPipeline";}

// Define query parameters interface
interface QueryParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Use Foo model but replace enum with string for OpenAPI compatibility
type FooForConsumption = Omit<Foo, "status"> & { status: string };

type FooThingEventForConsumption = Omit<FooThingEvent, "currentData" | "previousData"> & { currentData: FooForConsumption, previousData: FooForConsumption };

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
      sortOrder = "desc",
    }: QueryParams,
    { client, sql }
  ) => {
    const fooTableName = FooThingEventPipeline.table!;
    const sortColumn = FooThingEventPipeline.table?.columns["currentData"][sortBy || "createdAt"];
    console.log("sortColumn", sortColumn)

    const query = sql`
      SELECT currentData
      FROM ${fooTableName}
      ORDER BY ${sortColumn}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const resultSet = await client.query.execute<FooForConsumption>(query);
    return await resultSet.json();
  }
);
