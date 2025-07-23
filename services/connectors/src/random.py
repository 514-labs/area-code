from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from enum import Enum
import random
import string
import uuid
import json

class LogLevel(str, Enum):
    INFO = "INFO"
    DEBUG = "DEBUG"
    ERROR = "ERROR"
    WARN = "WARN"

class DataSourceType(str, Enum):
    Blob = "blob"
    Logs = "logs"
    Events = "events"

class BlobSource(BaseModel):
    id: str
    bucket_name: str
    file_path: str
    file_name: str
    file_size: int
    permissions: List[str]
    content_type: Optional[str]
    ingested_at: str

class LogSource(BaseModel):
    id: str
    timestamp: str
    level: LogLevel
    message: str
    source: Optional[str]
    trace_id: Optional[str]

class EventSource(BaseModel):
    id: str
    event_name: str
    timestamp: str
    distinct_id: str
    session_id: Optional[str]
    project_id: str
    properties: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]

def random_string(length: int) -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def random_log_level() -> LogLevel:
    return random.choice(list(LogLevel))

def random_date() -> datetime:
    seconds_ago = random.randint(0, 1000000000)
    return datetime.now() - timedelta(seconds=seconds_ago)

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

LOG_SOURCES = [
    "auth-service", "user-service", "payment-service", "api-gateway", "database", 
    "cache-service", "notification-service", "analytics", "monitoring", "scheduler"
]

# Realistic trace IDs that simulate distributed tracing
ACTIVE_TRACE_IDS = [
    "req_a1b2c3d4",    # User login flow
    "req_e5f6g7h8",    # Payment processing
    "req_i9j0k1l2",    # File upload
    "req_m3n4o5p6",    # Data sync operation
    "req_q7r8s9t0",    # Analytics batch job
    "req_u1v2w3x4",    # User registration
    "req_y5z6a7b8",    # API authentication
    "req_c9d0e1f2"     # Background cleanup
]

def get_content_type(file_name: str) -> Optional[str]:
    """Determine content type based on file extension"""
    extension = file_name.split('.')[-1].lower() if '.' in file_name else ''
    content_types = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
        'png': 'image/png',
        'csv': 'text/csv',
        'json': 'application/json',
        'txt': 'text/plain',
        'zip': 'application/zip',
        'mp3': 'audio/mpeg',
        'mp4': 'video/mp4',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
    return content_types.get(extension)

def generate_log_message(level: LogLevel) -> str:
    """Generate realistic log messages based on level"""
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

    warn_messages = [
        "Deprecated API endpoint called",
        "Rate limit approaching for user",
        "Disk space running low",
        "SSL certificate expires soon",
        "High memory usage detected",
        "Slow query detected",
        "Failed login attempt",
        "Configuration value not set, using default"
    ]

    if level == LogLevel.INFO:
        return random.choice(info_messages)
    elif level == LogLevel.DEBUG:
        return random.choice(debug_messages)
    elif level == LogLevel.ERROR:
        return random.choice(error_messages)
    else:
        return random.choice(warn_messages)

def random_blob_source() -> BlobSource:
    bucket = random.choice(BUCKET_NAMES)
    file_name = random.choice(FILE_NAMES)

    # Generate a realistic file path
    path_depth = random.randint(1, 3)
    folders = [random_string(random.randint(3, 8)) for _ in range(path_depth)]
    file_path = "/" + "/".join(folders) + "/"

    # Pick 1-4 unique permissions
    num_permissions = random.randint(1, len(BLOB_PERMISSIONS))
    permissions = random.sample(BLOB_PERMISSIONS, num_permissions)

    file_size = random.randint(256, 10 * 1024 * 1024)  # 256 bytes to 10 MB

    return BlobSource(
        id=str(uuid.uuid4()),
        bucket_name=bucket,
        file_path=file_path,
        file_name=file_name,
        file_size=file_size,
        permissions=permissions,
        content_type=get_content_type(file_name),
        ingested_at=datetime.now().isoformat()
    )

def random_log_source() -> LogSource:
    level = random_log_level()
    message = generate_log_message(level)
    source = random.choice(LOG_SOURCES)

    # Generate realistic trace_id that groups related logs together
    # 70% chance to have a trace_id from active traces (simulating distributed operations)
    trace_id = random.choice(ACTIVE_TRACE_IDS) if random.random() > 0.3 else None

    return LogSource(
        id=str(uuid.uuid4()),
        timestamp=datetime.now().isoformat(),
        level=level,
        message=message,
        source=source,
        trace_id=trace_id
    )

def random_event_source() -> EventSource:
    """Generate a structured EventSource object following PostHog model"""
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
    timestamp = datetime.now().isoformat()
    
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
        "referrer": random.choice(referrers)
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
    
    # Generate IP address and user agent
    ip_address = f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}"
    
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15",
        "Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0"
    ]
    user_agent = random.choice(user_agents)
    
    # Serialize properties as JSON string for ClickHouse compatibility
    properties_json = json.dumps(properties)
    
    return EventSource(
        id=str(uuid.uuid4()),
        event_name=event_name,
        timestamp=timestamp,
        distinct_id=distinct_id,
        session_id=session_id,
        project_id=project_id,
        properties=properties_json,
        ip_address=ip_address,
        user_agent=user_agent
    )
