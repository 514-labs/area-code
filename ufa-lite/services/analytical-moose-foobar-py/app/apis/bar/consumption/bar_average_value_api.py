from moose_lib import Api
from typing import Dict, Any
from pydantic import BaseModel
from app.external_models import bar_model
import time


class EmptyParams(BaseModel):
    """Empty parameters for endpoints with no input parameters"""
    pass


class GetBarsAverageValueResponse(BaseModel):
    averageValue: float
    queryTime: int
    count: int


def bar_average_value_api_handler(
    context,
    params: EmptyParams
) -> GetBarsAverageValueResponse:
    """
    API to get average value of all bars
    """
    start_time = time.time()

    query = """
        SELECT
            AVG(value) as averageValue,
            COUNT(*) as count
        FROM bar
        WHERE value IS NOT NULL
    """

    results = context.query(query, {})

    query_time = int((time.time() - start_time) * 1000)

    result = results[0] if results else {"averageValue": 0, "count": 0}

    return GetBarsAverageValueResponse(
        averageValue=float(result["averageValue"]),
        queryTime=query_time,
        count=int(result["count"])
    )


# Create the API instance
bar_average_value_api = Api[EmptyParams, GetBarsAverageValueResponse](
    name="bar-average-value",
    query_function=bar_average_value_api_handler
)