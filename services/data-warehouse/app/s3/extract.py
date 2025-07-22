from app.ingest.models import Foo
from app.utils.simulator import simulate_failures
from connectors.connector_factory import ConnectorFactory, ConnectorType
from connectors.s3connector import S3ConnectorConfig
from moose_lib import Task, TaskConfig, Workflow, WorkflowConfig, cli_log, CliLogData
from pydantic import BaseModel
from typing import Optional
import requests
import json

# This workflow extracts S3 data and sends it to the ingest API.
# For more information on workflows, see: https://docs.fiveonefour.com/moose/building/workflows.
#
# You may also direct insert into the table: https://docs.fiveonefour.com/moose/building/olap-table#direct-data-insertion.
#
# When the data lands in ingest, it goes through a stream where it is transformed.
# See app/ingest/transforms.py for the transformation logic.

class S3ExtractParams(BaseModel):
    batch_size: Optional[int] = 100
    fail_percentage: Optional[int] = 0

def run_task(input: S3ExtractParams) -> None:
    cli_log(CliLogData(action="S3Workflow", message="Running S3 task...", message_type="Info"))

    # Create a connector to extract data from S3
    connector = ConnectorFactory[Foo].create(
        ConnectorType.S3,
        S3ConnectorConfig(batch_size=input.batch_size)
    )

    # Extract data from S3
    data = connector.extract()

    cli_log(CliLogData(
        action="S3Workflow",
        message=f"Extracted {len(data)} items",
        message_type="Info"
    ))

    failed_count = simulate_failures(data, input.fail_percentage)
    if failed_count > 0:
        cli_log(CliLogData(
            action="S3Workflow",
            message=f"Marked {failed_count} items ({input.fail_percentage}%) as failed",
            message_type="Info"
        ))

    data_dicts = [item.model_dump() for item in data]
    
    try:
        response = requests.post(
            "http://localhost:4200/ingest/Foo",
            json=data_dicts,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        
        cli_log(CliLogData(
            action="S3Workflow",
            message=f"Successfully sent {len(data)} items to ingest API",
            message_type="Info"
        ))
    except Exception as e:
        cli_log(CliLogData(
            action="S3Workflow",
            message=f"Failed to send data to ingest API: {str(e)}",
            message_type="Error"
        ))

s3_task = Task[S3ExtractParams, None](
    name="s3-task",
    config=TaskConfig(run=run_task)
)

s3_workflow = Workflow(
    name="s3-workflow",
    config=WorkflowConfig(starting_task=s3_task)
)
