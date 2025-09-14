# AUTO-GENERATED FILE. DO NOT EDIT.
# This file will be replaced when you run `moose db pull`.

from pydantic import BaseModel, Field
from typing import Optional, Any, Annotated
import datetime
import ipaddress
from uuid import UUID
from enum import IntEnum, Enum
from moose_lib import Key, IngestPipeline, IngestPipelineConfig, OlapTable, OlapConfig, clickhouse_datetime64, clickhouse_decimal, ClickhouseSize, StringToEnumMixin
from moose_lib import clickhouse_default, LifeCycle
from moose_lib.blocks import MergeTreeEngine, ReplacingMergeTreeEngine, AggregatingMergeTreeEngine, SummingMergeTreeEngine, S3QueueEngine

class _peerdb_raw_mirror_a4be3c5e__1df3__45e4__805b__cb363b330b4e(BaseModel):
    UNDERSCORE_PREFIXED_peerdb_uid: UUID = Field(alias="_peerdb_uid")
    UNDERSCORE_PREFIXED_peerdb_timestamp: Annotated[int, "int64"] = Field(alias="_peerdb_timestamp")
    UNDERSCORE_PREFIXED_peerdb_destination_table_name: str = Field(alias="_peerdb_destination_table_name")
    UNDERSCORE_PREFIXED_peerdb_data: str = Field(alias="_peerdb_data")
    UNDERSCORE_PREFIXED_peerdb_record_type: Annotated[int, "int32"] = Field(alias="_peerdb_record_type")
    UNDERSCORE_PREFIXED_peerdb_match_data: str = Field(alias="_peerdb_match_data")
    UNDERSCORE_PREFIXED_peerdb_batch_id: Annotated[int, "int64"] = Field(alias="_peerdb_batch_id")
    UNDERSCORE_PREFIXED_peerdb_unchanged_toast_columns: str = Field(alias="_peerdb_unchanged_toast_columns")

class bar(BaseModel):
    id: Key[UUID]
    foo_id: UUID
    value: Annotated[int, "int32"]
    label: Optional[str] = None
    notes: Optional[str] = None
    is_enabled: bool
    created_at: clickhouse_datetime64(6)
    updated_at: clickhouse_datetime64(6)
    UNDERSCORE_PREFIXED_peerdb_synced_at: Annotated[clickhouse_datetime64(9), clickhouse_default("now64()")] = Field(alias="_peerdb_synced_at")
    UNDERSCORE_PREFIXED_peerdb_is_deleted: Annotated[int, "int8"] = Field(alias="_peerdb_is_deleted")
    UNDERSCORE_PREFIXED_peerdb_version: Annotated[int, "int64"] = Field(alias="_peerdb_version")

class foo(BaseModel):
    id: Key[UUID]
    name: str
    description: Optional[str] = None
    status: str
    priority: Annotated[int, "int32"]
    is_active: bool
    metadata: Optional[str] = None
    tags: list[str]
    score: Optional[clickhouse_decimal(10, 2)] = None
    large_text: Optional[str] = None
    created_at: clickhouse_datetime64(6)
    updated_at: clickhouse_datetime64(6)
    UNDERSCORE_PREFIXED_peerdb_synced_at: Annotated[clickhouse_datetime64(9), clickhouse_default("now64()")] = Field(alias="_peerdb_synced_at")
    UNDERSCORE_PREFIXED_peerdb_is_deleted: Annotated[int, "int8"] = Field(alias="_peerdb_is_deleted")
    UNDERSCORE_PREFIXED_peerdb_version: Annotated[int, "int64"] = Field(alias="_peerdb_version")

class users(BaseModel):
    id: Key[UUID]
    role: str
    created_at: clickhouse_datetime64(6)
    updated_at: clickhouse_datetime64(6)
    UNDERSCORE_PREFIXED_peerdb_synced_at: Annotated[clickhouse_datetime64(9), clickhouse_default("now64()")] = Field(alias="_peerdb_synced_at")
    UNDERSCORE_PREFIXED_peerdb_is_deleted: Annotated[int, "int8"] = Field(alias="_peerdb_is_deleted")
    UNDERSCORE_PREFIXED_peerdb_version: Annotated[int, "int64"] = Field(alias="_peerdb_version")

peerdb_raw_mirror_a_4_be_3_c_5_e_1_df_3_45_e_4_805_b_cb_363_b_330_b_4_e_model = OlapTable[_peerdb_raw_mirror_a4be3c5e__1df3__45e4__805b__cb363b330b4e]("_peerdb_raw_mirror_a4be3c5e__1df3__45e4__805b__cb363b330b4e", OlapConfig(
    order_by_fields=["_peerdb_batch_id", "_peerdb_destination_table_name"],
    life_cycle=LifeCycle.EXTERNALLY_MANAGED,
    engine=MergeTreeEngine(),
    settings={"index_granularity": "8192"},
))

bar_model = OlapTable[bar]("bar", OlapConfig(
    order_by_fields=["id"],
    life_cycle=LifeCycle.EXTERNALLY_MANAGED,
    engine=ReplacingMergeTreeEngine(ver="_peerdb_version"),
    settings={"index_granularity": "8192"},
))

foo_model = OlapTable[foo]("foo", OlapConfig(
    order_by_fields=["id"],
    life_cycle=LifeCycle.EXTERNALLY_MANAGED,
    engine=ReplacingMergeTreeEngine(ver="_peerdb_version"),
    settings={"index_granularity": "8192"},
))

users_model = OlapTable[users]("users", OlapConfig(
    order_by_fields=["id"],
    life_cycle=LifeCycle.EXTERNALLY_MANAGED,
    engine=ReplacingMergeTreeEngine(ver="_peerdb_version"),
    settings={"index_granularity": "8192"},
))


