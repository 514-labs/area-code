from moose_lib import Key, IngestPipeline, IngestPipelineConfig
from datetime import datetime
from enum import Enum
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

# These defines our data models for ingest pipelines.
# Connector workflows extracts data and into these pipelines.
# For more information on data models, see: https://docs.fiveonefour.com/moose/building/data-modeling.

class LogLevel(str, Enum):
    INFO = "INFO"
    DEBUG = "DEBUG"
    ERROR = "ERROR"
    WARN = "WARN"

class EventType(str, Enum):
    PAGEVIEW = "pageview"
    SIGNUP = "signup"
    LOGIN = "login"
    LOGOUT = "logout"
    CLICK = "click"
    PURCHASE = "purchase"
    ADD_TO_CART = "add_to_cart"
    REMOVE_FROM_CART = "remove_from_cart"
    CHECKOUT_STARTED = "checkout_started"
    CHECKOUT_COMPLETED = "checkout_completed"
    FORM_SUBMITTED = "form_submitted"
    VIDEO_PLAYED = "video_played"
    VIDEO_PAUSED = "video_paused"
    SEARCH = "search"
    SHARE = "share"
    DOWNLOAD = "download"
    FEATURE_USED = "feature_used"
    EXPERIMENT_VIEWED = "experiment_viewed"
    ERROR_OCCURRED = "error_occurred"
    SESSION_STARTED = "session_started"
    SESSION_ENDED = "session_ended"

# Source models - raw data from connectors
class BlobSource(BaseModel):
    id: Key[str]
    bucket_name: str
    file_path: str
    file_name: str
    file_size: int
    permissions: List[str]
    content_type: Optional[str]
    ingested_at: str

class LogSource(BaseModel):
    id: Key[str]
    timestamp: str
    level: LogLevel
    message: str
    source: Optional[str]  # service/component name
    trace_id: Optional[str]

class EventSource(BaseModel):
    id: Key[str]
    event_name: EventType
    timestamp: str  # ISO8601 format
    distinct_id: str  # User identifier (identified or anonymous)
    session_id: Optional[str]
    project_id: str
    properties: Optional[str]  # JSON string for ClickHouse compatibility
    ip_address: Optional[str]
    user_agent: Optional[str]
    ingested_at: str

# Final models - processed data with transformations
class Blob(BaseModel):
    id: Key[str]
    bucket_name: str
    file_path: str
    file_name: str
    file_size: int
    permissions: List[str]
    content_type: Optional[str]
    ingested_at: str
    transform_timestamp: str

class Log(BaseModel):
    id: Key[str]
    timestamp: str
    level: LogLevel
    message: str
    source: Optional[str]  # service/component name
    trace_id: Optional[str]
    transform_timestamp: str

class Event(BaseModel):
    id: Key[str]
    event_name: EventType
    timestamp: str  # ISO8601 format
    distinct_id: str  # User identifier (identified or anonymous)
    session_id: Optional[str]
    project_id: str
    properties: Optional[str]  # JSON string for ClickHouse compatibility
    ip_address: Optional[str]
    user_agent: Optional[str]
    ingested_at: str
    transform_timestamp: str

# Source ingest pipelines
blobSourceModel = IngestPipeline[BlobSource]("BlobSource", IngestPipelineConfig(
    ingest=True,
    stream=True,
    table=False,
    dead_letter_queue=True
))

logSourceModel = IngestPipeline[LogSource]("LogSource", IngestPipelineConfig(
    ingest=True,
    stream=True,
    table=False,
    dead_letter_queue=True
))

eventSourceModel = IngestPipeline[EventSource]("EventSource", IngestPipelineConfig(
    ingest=True,
    stream=True,
    table=False,
    dead_letter_queue=True
))

# Final processed pipelines
blobModel = IngestPipeline[Blob]("Blob", IngestPipelineConfig(
    ingest=True,
    stream=True,
    table=True,
    dead_letter_queue=True
))

logModel = IngestPipeline[Log]("Log", IngestPipelineConfig(
    ingest=True,
    stream=True,
    table=True,
    dead_letter_queue=True
))

eventModel = IngestPipeline[Event]("Event", IngestPipelineConfig(
    ingest=True,
    stream=True,
    table=True,
    dead_letter_queue=True
))
