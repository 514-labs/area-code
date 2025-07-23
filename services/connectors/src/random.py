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
    Blob = "blob"
    Logs = "logs"
    Events = "events"

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

# --- Blob simulation arrays ---
BUCKET_NAMES = [
    "data-archive-2024", "user-uploads-prod", "logs-bucket-main", "backup-jan2024", "media-assets-eu",
    "project-x-files", "customer-data", "analytics-results", "temp-storage", "archive-2023",
    "prod-photos", "staging-logs", "dev-bucket-01", "ml-training-data", "iot-sensor-dumps",
    "web-assets", "cdn-cache", "user-profile-pics", "audit-logs", "financial-reports",
    "marketing-campaigns", "legal-docs", "compliance-archive", "partner-uploads", "team-shared",
    "research-data", "test-bucket", "video-uploads", "audio-files", "backup-2022",
    "raw-data-ingest", "processed-data", "exported-csvs", "import-batch", "client-exports",
    "internal-reports", "external-shares", "event-logs", "sensor-logs", "public-assets",
    "private-assets", "user-generated", "system-backups", "release-artifacts", "build-cache",
    "feature-flags", "beta-uploads", "legacy-data", "onboarding-files", "support-tickets"
]

FILE_NAMES = [
    "report_2024-06-01.csv", "image_1234.png", "backup_20240601.zip", "audio_20240601.mp3", "video_20240601.mp4",
    "document_20240601.pdf", "data_20240601.json", "log_20240601.txt", "presentation_20240601.pptx", "spreadsheet_20240601.xlsx",
    "invoice_20240601.pdf", "contract_20240601.docx", "notes_20240601.md", "diagram_20240601.svg", "archive_20240601.tar.gz",
    "user_5678_profile.jpg", "avatar_4321.png", "resume_20240601.doc", "summary_20240601.txt", "draft_20240601.rtf",
    "config_20240601.yaml", "settings_20240601.ini", "db_dump_20240601.sql", "export_20240601.csv", "import_20240601.csv",
    "photo_20240601.jpeg", "screenshot_20240601.png", "icon_20240601.ico", "font_20240601.ttf", "readme_20240601.md",
    "changelog_20240601.txt", "release_20240601.zip", "patch_20240601.diff", "sample_20240601.csv", "test_20240601.json",
    "input_20240601.txt", "output_20240601.txt", "error_20240601.log", "trace_20240601.log", "metrics_20240601.csv",
    "profile_20240601.json", "avatar_20240601.jpg", "banner_20240601.png", "cover_20240601.jpg", "slide_20240601.ppt",
    "form_20240601.pdf", "statement_20240601.pdf", "bill_20240601.pdf", "ticket_20240601.pdf", "evidence_20240601.png"
]

BLOB_PERMISSIONS = ["READ", "WRITE", "DELETE", "LIST"]

import os

def generate_blob_log_line() -> str:
    bucket = random.choice(BUCKET_NAMES)
    file = random.choice(FILE_NAMES)
    # Simulate a path depth of 1-3 folders
    path_depth = random.randint(1, 3)
    folders = [random_string(random.randint(3, 8)) for _ in range(path_depth)]
    blob_path = f"blob://{bucket}/{'/'.join(folders)}/{file}"
    # Pick 1-4 unique permissions, comma separated
    num_permissions = random.randint(1, len(BLOB_PERMISSIONS))
    permissions = ", ".join(random.sample(BLOB_PERMISSIONS, num_permissions))
    timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    file_size = random.randint(256, 10 * 1024 * 1024)  # 256 bytes to 10 MB
    return f"{timestamp} | {blob_path} | {permissions} | {file_size} bytes"

def generate_event_log_line() -> str:
    """Generate a PostHog-style event log line"""
    event_names = [
        "pageview", "signup", "login", "logout", "click", "purchase", "add_to_cart", 
        "remove_from_cart", "checkout_started", "checkout_completed", "form_submitted",
        "video_played", "video_paused", "search", "share", "download", "feature_used",
        "experiment_viewed", "error_occurred", "session_started", "session_ended"
    ]
    
    browsers = ["Chrome", "Firefox", "Safari", "Edge", "Opera"]
    referrers = [
        "https://google.com/search", "https://facebook.com", "https://twitter.com",
        "https://linkedin.com", "https://github.com", "direct", "email_campaign",
        "https://reddit.com", "https://stackoverflow.com", "organic_search"
    ]
    
    signup_methods = ["email", "google_oauth", "github_oauth", "facebook_oauth", "manual"]
    devices = ["desktop", "mobile", "tablet"]
    operating_systems = ["Windows", "macOS", "Linux", "iOS", "Android"]
    
    event_name = random.choice(event_names)
    timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    
    # Generate user IDs (mix of identified and anonymous)
    if random.random() > 0.3:  # 70% identified users
        distinct_id = f"user_{random.randint(1000, 9999)}"
    else:  # 30% anonymous
        distinct_id = str(uuid.uuid4())
    
    session_id = str(uuid.uuid4())
    project_id = f"proj_{random.choice(['web', 'mobile', 'api', 'admin'])}"
    
    # Generate realistic properties based on event type
    properties = {
        "browser": random.choice(browsers),
        "device_type": random.choice(devices),
        "os": random.choice(operating_systems),
        "referrer": random.choice(referrers),
        "ip": f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}"
    }
    
    # Add event-specific properties
    if event_name == "signup":
        properties["signup_method"] = random.choice(signup_methods)
    elif event_name == "purchase":
        properties["amount"] = round(random.uniform(10.0, 500.0), 2)
        properties["currency"] = "USD"
        properties["product_count"] = random.randint(1, 5)
    elif event_name == "pageview":
        pages = ["/home", "/about", "/products", "/pricing", "/contact", "/blog", "/docs"]
        properties["page"] = random.choice(pages)
        properties["page_title"] = f"Page {properties['page'].replace('/', '').title()}"
    elif event_name == "click":
        properties["element_type"] = random.choice(["button", "link", "image", "form"])
        properties["element_text"] = random.choice(["Get Started", "Learn More", "Sign Up", "Download"])
    
    # Convert properties to a more compact string representation for storage
    props_str = " | ".join([f"{k}={v}" for k, v in properties.items()])
    
    return f"{event_name} | {timestamp} | {distinct_id} | {session_id} | {project_id} | {props_str}"

def random_foo(source_type: DataSourceType) -> Foo:
    base_tags = [random_string(4) for _ in range(random.randint(1, 3))]

    if source_type == DataSourceType.Blob:
        tags = base_tags + ["Blob"]
        large_text = generate_blob_log_line()
    elif source_type == DataSourceType.Logs:
        tags = base_tags + ["Logs"]
        large_text = generate_log_line()
    elif source_type == DataSourceType.Events:
        tags = base_tags + ["Events"]
        large_text = generate_event_log_line()
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