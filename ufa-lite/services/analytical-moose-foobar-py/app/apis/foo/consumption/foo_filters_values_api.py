from moose_lib import Api
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timedelta


class GetFooFiltersValuesParams(BaseModel):
    months: Optional[int] = 6


class GetFooFiltersValuesResponse(BaseModel):
    status: List[str]
    tags: List[str]
    priorities: List[int]


def foo_filters_values_api_handler(
    context,
    params: GetFooFiltersValuesParams
) -> GetFooFiltersValuesResponse:
    """
    API to get distinct filter values for foo data
    """
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=max(1, min(params.months, 36)) * 30)

    start_date_str = start_date.strftime("%Y-%m-%d")
    end_date_str = end_date.strftime("%Y-%m-%d")

    # Build queries for distinct values
    date_filter = f"""
        toDate(created_at) >= toDate('{start_date_str}')
        AND toDate(created_at) <= toDate('{end_date_str}')
    """

    status_query = f"""
        SELECT DISTINCT status
        FROM foo
        WHERE {date_filter}
          AND status IS NOT NULL
        ORDER BY status
    """

    tags_query = f"""
        SELECT DISTINCT arrayJoin(tags) AS tag
        FROM foo
        WHERE {date_filter}
          AND tags IS NOT NULL
        ORDER BY tag
    """

    priorities_query = f"""
        SELECT DISTINCT priority
        FROM foo
        WHERE {date_filter}
          AND priority IS NOT NULL
        ORDER BY priority
    """

    # Execute queries
    status_results = context.query(status_query, {})
    tags_results = context.query(tags_query, {})
    priorities_results = context.query(priorities_query, {})

    # Extract values from results
    possible_statuses = [row["status"] for row in status_results]
    possible_tags = [row["tag"] for row in tags_results]
    possible_priorities = [int(row["priority"]) for row in priorities_results]

    return GetFooFiltersValuesResponse(
        status=possible_statuses,
        tags=possible_tags,
        priorities=possible_priorities
    )


# Create the API instance
foo_filters_values_api = Api[GetFooFiltersValuesParams, GetFooFiltersValuesResponse](
    name="foo-filters-values",
    query_function=foo_filters_values_api_handler
)