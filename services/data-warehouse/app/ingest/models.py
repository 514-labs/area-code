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
