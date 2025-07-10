from moose_lib import Task, TaskConfig, Workflow, WorkflowConfig, cli_log, CliLogData
from connectors.connector_factory import ConnectorFactory, ConnectorType
from connectors.datadog_connector import DatadogConnectorConfig
from app.ingest.models import Foo
import requests
import json

def run_task() -> None:
    cli_log(CliLogData(action="DatadogWorkflow", message="Running Datadog task...", message_type="Info"))

    connector = ConnectorFactory[Foo].create(
        ConnectorType.Datadog,
        DatadogConnectorConfig(batch_size=100)
    )

    data = connector.extract()

    cli_log(CliLogData(
        action="DatadogWorkflow",
        message=f"Extracted {len(data)} items",
        message_type="Info"
    ))

    data_dicts = [item.model_dump() for item in data]

    cli_log(CliLogData(
        action="DatadogWorkflow",
        message=f"Data to send: {json.dumps(data_dicts, default=str)}",
        message_type="Info"
    ))
    
    try:
        response = requests.post(
            "http://localhost:4000/ingest/Foo",
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

datadog_task = Task[None, None](
    name="datadog-task",
    config=TaskConfig(run=run_task)
)

datadog_workflow = Workflow(
    name="datadog-workflow",
    config=WorkflowConfig(starting_task=datadog_task)
)
