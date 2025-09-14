# Welcome to your new Moose analytical backend! 🦌

# Getting Started Guide:

# 1. Data Modeling
# First, plan your data structure and create your data models
# → See: docs.fiveonefour.com/moose/building/data-modeling
#   Learn about type definitions and data validation

# 2. Set Up Ingestion
# Create ingestion pipelines to receive your data via REST APIs
# → See: docs.fiveonefour.com/moose/building/ingestion
#   Learn about IngestPipeline, data formats, and validation

# 3. Create Workflows
# Build data processing pipelines to transform and analyze your data
# → See: docs.fiveonefour.com/moose/building/workflows
#   Learn about task scheduling and data processing

# 4. Configure Consumption APIs
# Set up queries and real-time analytics for your data
# → See: docs.fiveonefour.com/moose/building/consumption-apis

# Need help? Check out the quickstart guide:
# → docs.fiveonefour.com/moose/getting-started/quickstart

from .external_models import *


from pydantic import BaseModel, Field
from typing import Optional, Any, Annotated
import datetime
import ipaddress
from uuid import UUID
from enum import IntEnum, Enum
from moose_lib import Key, IngestPipeline, IngestPipelineConfig, OlapTable, OlapConfig, clickhouse_datetime64, clickhouse_decimal, ClickhouseSize, StringToEnumMixin
from moose_lib import clickhouse_default, LifeCycle
from moose_lib.blocks import MergeTreeEngine, ReplacingMergeTreeEngine, AggregatingMergeTreeEngine, SummingMergeTreeEngine, S3QueueEngine

class dish(BaseModel):
    id: Annotated[int, "uint32"]
    name: str
    description: str
    menus_appeared: Annotated[int, "uint32"]
    times_appeared: Annotated[int, "int32"]
    first_appeared: Annotated[int, "uint16"]
    last_appeared: Annotated[int, "uint16"]
    lowest_price: clickhouse_decimal(18, 3)
    highest_price: clickhouse_decimal(18, 3)

dish_model = OlapTable[dish]("dish", OlapConfig(
    order_by_fields=["id"],
    engine=MergeTreeEngine(),
    settings={"index_granularity": "8192"},
))


