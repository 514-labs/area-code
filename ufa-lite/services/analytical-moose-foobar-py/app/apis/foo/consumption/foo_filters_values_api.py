from moose_lib import Api, MooseClient
from typing import Optional, List
from pydantic import BaseModel
from app.external_models import foo_table
from datetime import datetime, timedelta


class GetFooFiltersValuesParams(BaseModel):
    months: Optional[int] = 6


class GetFooFiltersValuesResponse(BaseModel):
    status: List[str]
    tags: List[str]
    priorities: List[int]


def foo_filters_values_api_handler(
    client: MooseClient,
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
        toDate({foo_table.columns.created_at}) >= toDate('{start_date_str}')
        AND toDate({foo_table.columns.created_at}) <= toDate('{end_date_str}')
    """

    status_query = f"""
        SELECT DISTINCT {foo_table.columns.status}
        FROM {foo_table.name}
        WHERE {date_filter}
          AND {foo_table.columns.status} IS NOT NULL
        ORDER BY {foo_table.columns.status}
    """

    tags_query = f"""
        SELECT DISTINCT arrayJoin({foo_table.columns.tags}) AS tag
        FROM {foo_table.name}
        WHERE {date_filter}
          AND {foo_table.columns.tags} IS NOT NULL
        ORDER BY tag
    """

    priorities_query = f"""
        SELECT DISTINCT {foo_table.columns.priority}
        FROM {foo_table.name}
        WHERE {date_filter}
          AND {foo_table.columns.priority} IS NOT NULL
        ORDER BY {foo_table.columns.priority}
    """

    # Execute queries
    status_results = client.query(status_query, {})
    tags_results = client.query(tags_query, {})
    priorities_results = client.query(priorities_query, {})

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