import { ConsumptionApi } from "@514labs/moose-lib";
import {
  Foo,
  FooWithCDCForConsumption,
  GetFoosWithCDCParams,
  GetFoosWithCDCForConsumptionResponse,
} from "@workspace/models";

// Consumption API following Moose documentation pattern
export const fooConsumptionApi = new ConsumptionApi<
  GetFoosWithCDCParams,
  GetFoosWithCDCForConsumptionResponse
>(
  "foo",
  async (
    {
      limit = 10,
      offset = 0,
      sortBy = "created_at",
      sortOrder = "DESC",
    }: GetFoosWithCDCParams,
    { client, sql }
  ) => {
    // Convert sortOrder to uppercase for consistency
    const upperSortOrder = sql([`${sortOrder.toUpperCase()}`]);

    const countQuery = sql`
      SELECT count() as total
      FROM foo
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
      SELECT *
      FROM foo
      ORDER BY ${sortBy} ${upperSortOrder}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const resultSet =
      await client.query.execute<FooWithCDCForConsumption>(query);
    const results = (await resultSet.json()) as FooWithCDCForConsumption[];

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
