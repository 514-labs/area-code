from moose_lib import Key, IngestPipeline, IngestPipelineConfig
from datetime import datetime
from enum import Enum
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

# These defines our data models for ingest pipelines.
# Connector workflows extracts data and into these pipelines.
# For more information on data models, see: https://docs.fiveonefour.com/moose/building/data-modeling.

class BlobStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    ARCHIVED = "archived"

class LogStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    ARCHIVED = "archived"

# Source models - raw data from connectors
class BlobSource(BaseModel):
    id: Key[str]
    name: str
    description: Optional[str]
    status: BlobStatus
    priority: int
    is_active: bool
    tags: List[str]
    score: float
    large_text: str

class LogSource(BaseModel):
    id: Key[str]
    name: str
    description: Optional[str]
    status: LogStatus
    priority: int
    is_active: bool
    tags: List[str]
    score: float
    large_text: str

# Final models - processed data with transformations
class Blob(BaseModel):
    id: Key[str]
    name: str
    description: Optional[str]
    status: BlobStatus
    priority: int
    is_active: bool
    tags: List[str]
    score: float
    large_text: str
    transform_timestamp: str

class Log(BaseModel):
    id: Key[str]
    name: str
    description: Optional[str]
    status: LogStatus
    priority: int
    is_active: bool
    tags: List[str]
    score: float
    large_text: str
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
