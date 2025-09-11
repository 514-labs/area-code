import { Api } from "@514labs/moose-lib";

export type GetFooFiltersValuesParams = {
  months?: number;
};

export type GetFooFiltersValuesResponse = {
  status: string[];
  tags: string[];
  priorities: number[];
};

export const fooFiltersValuesApi = new Api<
  GetFooFiltersValuesParams,
  GetFooFiltersValuesResponse
>(
  "foo-filters-values",
  async (
    { months = 6 }: GetFooFiltersValuesParams,
    { client, sql }
  ): Promise<GetFooFiltersValuesResponse> => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(
      startDate.getMonth() - Math.max(1, Math.min(months, 36))
    );

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    const statusQuery = sql`
      SELECT DISTINCT status
      FROM foo
      WHERE toDate(created_at) >= toDate(${startDateStr})
        AND toDate(created_at) <= toDate(${endDateStr})
        AND status IS NOT NULL
      ORDER BY status
    `;

    const tagsQuery = sql`
      SELECT DISTINCT arrayJoin(tags) AS tag
      FROM foo
      WHERE toDate(created_at) >= toDate(${startDateStr})
        AND toDate(created_at) <= toDate(${endDateStr})
        AND tags IS NOT NULL
      ORDER BY tag
    `;

    const prioritiesQuery = sql`
      SELECT DISTINCT priority
      FROM foo
      WHERE toDate(created_at) >= toDate(${startDateStr})
        AND toDate(created_at) <= toDate(${endDateStr})
        AND priority IS NOT NULL
      ORDER BY priority
    `;

    const [statusSet, tagsSet, prioritiesSet] = await Promise.all([
      client.query.execute<{ status: string }>(statusQuery),
      client.query.execute<{ tag: string }>(tagsQuery),
      client.query.execute<{ priority: number }>(prioritiesQuery),
    ]);

    const statusRows = (await statusSet.json()) as { status: string }[];
    const tagRows = (await tagsSet.json()) as { tag: string }[];
    const priorityRows = (await prioritiesSet.json()) as { priority: number }[];

    const possibleStatuses = statusRows.map((row) => row.status);
    const possibleTags = tagRows.map((row) => row.tag);
    const possiblePriorities = priorityRows.map((row) => row.priority);

    return {
      status: possibleStatuses,
      tags: possibleTags,
      priorities: possiblePriorities,
    };
  }
);
