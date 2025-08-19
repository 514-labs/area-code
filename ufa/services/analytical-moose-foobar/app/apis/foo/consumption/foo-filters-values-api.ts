import { ConsumptionApi } from "@514labs/moose-lib";
import { FooPipeline } from "../../../index";
import {
  GetFooFiltersValuesParams,
  GetFooFiltersValuesResponse,
} from "@workspace/models/foo";

export const fooFiltersValuesApi = new ConsumptionApi<
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

    // Query for distinct status and tag values
    const statusQuery = sql`
      SELECT DISTINCT status
      FROM ${FooPipeline.table!}
      WHERE toDate(created_at) >= toDate(${startDateStr})
        AND toDate(created_at) <= toDate(${endDateStr})
        AND status IS NOT NULL
        AND cdc_operation != 'DELETE'
      ORDER BY status
    `;

    const tagsQuery = sql`
      SELECT DISTINCT arrayJoin(tags) AS tag
      FROM ${FooPipeline.table!}
      WHERE toDate(created_at) >= toDate(${startDateStr})
        AND toDate(created_at) <= toDate(${endDateStr})
        AND tags IS NOT NULL
        AND cdc_operation != 'DELETE'
      ORDER BY tag
    `;

    const [statusSet, tagsSet] = await Promise.all([
      client.query.execute<{ status: string }>(statusQuery),
      client.query.execute<{ tag: string }>(tagsQuery),
    ]);

    const statusRows = (await statusSet.json()) as { status: string }[];
    const tagRows = (await tagsSet.json()) as { tag: string }[];

    const possibleStatuses = statusRows.map((row) => row.status);
    const possibleTags = tagRows.map((row) => row.tag);

    return {
      status: possibleStatuses,
      tags: possibleTags,
    };
  }
);
