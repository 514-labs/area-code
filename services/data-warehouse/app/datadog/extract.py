from moose_lib import Task, TaskConfig, Workflow, WorkflowConfig, cli_log, CliLogData
from connectors.connector_factory import ConnectorFactory, ConnectorType
from connectors.datadog_connector import DatadogConnectorConfig
from app.ingest.models import Foo
from app.utils.simulator import simulate_failures
from pydantic import BaseModel
from typing import Optional
import requests
import json

class DatadogExtractParams(BaseModel):
    batch_size: Optional[int] = 100
    fail_percentage: Optional[int] = 0

def run_task(input: DatadogExtractParams) -> None:
    cli_log(CliLogData(action="DatadogWorkflow", message="Running Datadog task...", message_type="Info"))

    connector = ConnectorFactory[Foo].create(
        ConnectorType.Datadog,
        DatadogConnectorConfig(batch_size=input.batch_size)
    )

    data = connector.extract()

    cli_log(CliLogData(
        action="DatadogWorkflow",
        message=f"Extracted {len(data)} items",
        message_type="Info"
    ))

    failed_count = simulate_failures(data, input.fail_percentage)
    if failed_count > 0:
        cli_log(CliLogData(
            action="DatadogWorkflow",
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
            action="DatadogWorkflow",
            message=f"Successfully sent {len(data)} items to ingest API",
            message_type="Info"
        ))
    except Exception as e:
        cli_log(CliLogData(
            action="DatadogWorkflow",
            message=f"Failed to send data to ingest API: {str(e)}",
            message_type="Error"
        ))

datadog_task = Task[DatadogExtractParams, None](
    name="datadog-task",
    config=TaskConfig(run=run_task)
)

datadog_workflow = Workflow(
    name="datadog-workflow",
    config=WorkflowConfig(starting_task=datadog_task)
)
