from app.ingest.models import UnstructuredDataSource
from app.utils.simulator import simulate_failures
from connectors.connector_factory import ConnectorFactory, ConnectorType
from connectors.unstructured_data_connector import UnstructuredDataConnectorConfig
from moose_lib import Task, TaskConfig, Workflow, WorkflowConfig, cli_log, CliLogData
from pydantic import BaseModel
from typing import Optional
import requests
import json

# This workflow extracts UnstructuredData and sends it to the ingest API.
# For more information on workflows, see: https://docs.fiveonefour.com/moose/building/workflows.
#
# Unlike other connectors, this workflow only processes user-submitted data
# and does not generate random data.
#
# When the data lands in ingest, it goes through a stream where it is transformed.
# See app/ingest/transforms.py for the transformation logic.

class UnstructuredDataExtractParams(BaseModel):
    batch_size: Optional[int] = 100
    fail_percentage: Optional[int] = 0

def run_task(input: UnstructuredDataExtractParams) -> None:
    cli_log(CliLogData(action="UnstructuredDataWorkflow", message="Running UnstructuredData task...", message_type="Info"))

    # Create a connector to extract data from UnstructuredData
    connector = ConnectorFactory[UnstructuredDataSource].create(
        ConnectorType.UnstructuredData,
        UnstructuredDataConnectorConfig(batch_size=input.batch_size)
    )

    # Check if there's any pending data
    if not connector.has_pending_data():
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message="No pending unstructured data to process",
            message_type="Info"
        ))
        return

    # Extract data from UnstructuredData
    data = connector.extract()

    cli_log(CliLogData(
        action="UnstructuredDataWorkflow",
        message=f"Extracted {len(data)} items",
        message_type="Info"
    ))

    # Apply failure simulation if specified
    failed_count = simulate_failures(data, input.fail_percentage)
    if failed_count > 0:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Marked {failed_count} items ({input.fail_percentage}%) as failed",
            message_type="Info"
        ))

    data_dicts = [item.model_dump() for item in data]
    
    try:
        response = requests.post(
            "http://localhost:4200/ingest/UnstructuredDataSource",
            json=data_dicts,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Successfully sent {len(data)} items to ingest API",
            message_type="Info"
        ))
    except Exception as e:
        cli_log(CliLogData(
            action="UnstructuredDataWorkflow",
            message=f"Failed to send data to ingest API: {str(e)}",
            message_type="Error"
        ))

unstructured_data_task = Task[UnstructuredDataExtractParams, None](
    name="unstructured-data-task",
    config=TaskConfig(run=run_task)
)

unstructured_data_workflow = Workflow(
    name="unstructured-data-workflow",
    config=WorkflowConfig(starting_task=unstructured_data_task)
) 