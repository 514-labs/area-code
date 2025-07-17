# Main entry point for moose. Moose reads these imports & figures out
# which infrastructure to setup.

from app.ingest import models, transforms
from app.s3.extract import s3_workflow, s3_task
from app.datadog.extract import datadog_workflow, datadog_task

import app.apis.get_foo as get_foo_apis
import app.apis.get_foos as get_foos_apis
import app.apis.get_bars as get_bars_apis
import app.apis.extract_s3 as extract_s3_apis
import app.apis.extract_datadog as extract_datadog_apis