from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from enum import Enum
import random
import string
import uuid

class FooStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    ARCHIVED = "archived"

class DataSourceType(str, Enum):
    S3 = "s3"
    Datadog = "datadog"

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
    # created_at: datetime
    # updated_at: datetime

def random_string(length: int) -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def random_enum(enum_class: type[FooStatus]) -> FooStatus:
    return random.choice(list(enum_class))

def random_date() -> datetime:
    seconds_ago = random.randint(0, 1000000000)
    return datetime.now() - timedelta(seconds=seconds_ago)

def generate_log_line() -> str:
    """Generate a structured log line in the format [LOG_LEVEL] | timestamp | message"""
    log_levels = ["INFO", "DEBUG", "ERROR"]
    log_level = random.choice(log_levels)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Different message pools for each log level
    info_messages = [
        "Application started successfully",
        "User session created",
        "Database connection established",
        "Transaction completed successfully",
        "Scheduled job executed",
        "API endpoint called",
        "Cache refreshed",
        "Service health check passed"
    ]

    debug_messages = [
        "Cache miss for key user_12345",
        "API response time: 234ms",
        "Memory usage: 85%",
        "Thread pool size: 10",
        "SQL query executed in 45ms",
        "Processing batch of 500 records",
        "Variable state: user_id=12345, status=active",
        "Function entered with parameters: limit=100, offset=0"
    ]

    error_messages = [
        "Failed to connect to external service",
        "Invalid authentication token",
        "Data validation failed",
        "Database timeout exceeded",
        "HTTP 500 Internal Server Error",
        "Out of memory exception",
        "Connection refused by upstream server",
        "File not found: /path/to/config.yaml"
    ]

    # Select message based on log level
    if log_level == "INFO":
        message = random.choice(info_messages)
    elif log_level == "DEBUG":
        message = random.choice(debug_messages)
    else:  # ERROR
        message = random.choice(error_messages)

    return f"{log_level} | {timestamp} | {message}"

def random_foo(source_type: DataSourceType) -> Foo:
    base_tags = [random_string(4) for _ in range(random.randint(1, 3))]

    if source_type == DataSourceType.S3:
        tags = base_tags + ["S3"]
        large_text = random_string(100)
    elif source_type == DataSourceType.Datadog:
        tags = base_tags + ["Datadog"]
        large_text = generate_log_line()
    else:
        tags = base_tags
        large_text = random_string(100)

    return Foo(
        id=str(uuid.uuid4()),
        name=random_string(8),
        description=random_string(20) if random.random() > 0.5 else None,
        status=random_enum(FooStatus),
        priority=random.randint(0, 9),
        is_active=random.random() > 0.5,
        tags=tags,
        score=round(random.random() * 100, 2),
        large_text=large_text,
        # created_at=random_date(),
        # updated_at=random_date()
    )