# All APIs for the analytical service
from .foo.consumption import (
    foo_consumption_api,
    foo_cube_aggregations_api,
    foo_filters_values_api,
    foo_score_over_time_api
)
from .bar.consumption import (
    bar_consumption_api,
    bar_average_value_api
)

__all__ = [
    # Foo APIs
    "foo_consumption_api",
    "foo_cube_aggregations_api",
    "foo_filters_values_api",
    "foo_score_over_time_api",
    # Bar APIs
    "bar_consumption_api",
    "bar_average_value_api"
]