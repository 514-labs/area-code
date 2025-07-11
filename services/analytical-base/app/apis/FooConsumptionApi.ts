import { ConsumptionApi } from "@514labs/moose-lib";
import { Foo } from "@workspace/models";

// Define query parameters interface
interface QueryParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
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
      sortOrder = "desc",
    }: QueryParams,
    { client, sql }
  ) => {
    // TODO: Something's not quite right with the sql interpolation here
    const query = sql`
      SELECT *
      FROM foo
      ORDER BY ${sortBy || "createdAt"} ${sortOrder === "asc" ? "ASC" : "DESC"}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // const resultSet = await client.query.execute<FooForConsumption>(query);
    // return await resultSet.json();
    return [{
      id: "foo",
      name: "foo",
      description: "foo",
      priority: 1,
      isActive: true,
      metadata: {},
      tags: [],
      score: 1,
      largeText: "foo",
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "active",
    }];
  }
);
