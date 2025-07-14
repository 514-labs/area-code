from moose_lib import Key, IngestPipeline, IngestPipelineConfig
from datetime import datetime
from enum import Enum
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class FooStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    ARCHIVED = "archived"

class Foo(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: FooStatus
    priority: int
    is_active: bool
    tags: List[str]
    score: float
    large_text: str

class Bar(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: FooStatus
    priority: int
    is_active: bool
    tags: List[str]
    score: float
    large_text: str
    transform_timestamp: str

fooModel = IngestPipeline[Foo]("Foo", IngestPipelineConfig(
    ingest=True,
    stream=True,
    table=True,
    dead_letter_queue=True
))

barModel = IngestPipeline[Bar]("Bar", IngestPipelineConfig(
    ingest=True,
    stream=True,
    table=True,
    dead_letter_queue=True
))