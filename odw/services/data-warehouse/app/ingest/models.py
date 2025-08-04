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

class EventSource(BaseModel):
    id: Key[str]
    event_name: str
    timestamp: str
    distinct_id: str
    session_id: Optional[str]
    project_id: str
    properties: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]

class UnstructuredDataSource(BaseModel):
    id: Key[str]
    source_file_path: str
    extracted_data: Optional[str] = None
    processed_at: str
    processing_instructions: Optional[str] = None

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
    event_name: str
    timestamp: str
    distinct_id: str
    session_id: Optional[str]
    project_id: str
    properties: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    transform_timestamp: str

class UnstructuredData(BaseModel):
    id: Key[str]
    source_file_path: str
    extracted_data: Optional[str] = None
    processed_at: str
    processing_instructions: Optional[str] = None
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

unstructuredDataSourceModel = IngestPipeline[UnstructuredDataSource]("UnstructuredDataSource", IngestPipelineConfig(
    ingest=True,
    stream=True,
    table=False,  # No table needed - only for DLQ processing
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

class Medical(BaseModel):
    id: Key[str]
    patient_name: str
    patient_age: str
    phone_number: str
    scheduled_appointment_date: str
    dental_procedure_name: str
    doctor: str
    transform_timestamp: str
    source_file_path: str

unstructuredDataModel = IngestPipeline[UnstructuredData]("UnstructuredData", IngestPipelineConfig(
    ingest=True,
    stream=True,
    table=True,  # Creates the staging table that automatic extraction expects
    dead_letter_queue=True
))

medicalModel = IngestPipeline[Medical]("Medical", IngestPipelineConfig(
    ingest=True,
    stream=True,
    table=True,
    dead_letter_queue=True
))
