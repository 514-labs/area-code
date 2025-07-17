import { ConsumptionApi } from "@514labs/moose-lib";

// Define query parameters interface
interface QueryParams {
  limit?: number;
  offset?: number;
  sortBy?: keyof FooCurrentStateRecord;
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
}

// Interface for the current state record as returned by the materialized view
interface FooCurrentStateRecord {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: number;
  is_active: boolean;
  metadata: string; // JSON stored as string after toString conversion
  tags: string;     // Array stored as string after toString conversion  
  score: number;
  large_text: string;
  created_at: string; // DateTime stored as string
  updated_at: string; // DateTime stored as string
}

// Interface for API response with pagination and proper typing
interface FooCurrentStateResponse {
  data: FooCurrentStateRecord[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// Main consumption API for current state foo data
export const fooCurrentStateApi = new ConsumptionApi<QueryParams, FooCurrentStateResponse>(
  "foo-current-state",
  async (
    {
      limit = 10,
      offset = 0,
      sortBy = "updated_at",
      sortOrder = "DESC",
    }: QueryParams,
    { client, sql }
  ) => {
    // Convert sortOrder to uppercase for consistency
    const upperSortOrder = sql([`${sortOrder.toUpperCase()}`]);

    // Get total count of active records (non-deleted) using subquery approach
    const countQuery = sql`
      SELECT count() as total
      FROM (
        SELECT 
          id,
          argMaxMerge(latest_operation) as latest_op
        FROM foo_current_state
        GROUP BY id
        HAVING latest_op != 'DELETE'
      )
    `;

    const countResultSet = await client.query.execute<{
      total: number;
    }>(countQuery);
    const countResults = (await countResultSet.json()) as {
      total: number;
    }[];
    const totalCount = countResults[0]?.total || 0;

    // Build main query using argMaxMerge to read from AggregatingMergeTree
    const query = sql`
      SELECT 
        id,
        argMaxMerge(name) as name,
        argMaxMerge(description) as description,
        argMaxMerge(status) as status,
        argMaxMerge(priority) as priority,
        argMaxMerge(is_active) as is_active,
        argMaxMerge(metadata) as metadata,
        argMaxMerge(tags) as tags,
        argMaxMerge(score) as score,
        argMaxMerge(large_text) as large_text,
        argMaxMerge(created_at) as created_at,
        argMaxMerge(updated_at) as updated_at
      FROM foo_current_state
      GROUP BY id
      HAVING argMaxMerge(latest_operation) != 'DELETE'
      ORDER BY ${sql([sortBy])} ${upperSortOrder}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const resultSet = await client.query.execute<FooCurrentStateRecord>(query);
    const results = (await resultSet.json()) as FooCurrentStateRecord[];

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
    };
  }
);

