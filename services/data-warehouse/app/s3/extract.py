from moose_lib import Task, TaskConfig, Workflow, WorkflowConfig, cli_log, CliLogData
from connectors.connector_factory import ConnectorFactory, ConnectorType
from connectors.s3connector import S3ConnectorConfig
from app.ingest.models import Foo
import requests
import json

def run_task() -> None:
    cli_log(CliLogData(action="S3Workflow", message="Running S3 task...", message_type="Info"))

    connector = ConnectorFactory[Foo].create(
        ConnectorType.S3,
        S3ConnectorConfig(batch_size=100)
    )

    data = connector.extract()

    cli_log(CliLogData(
        action="S3Workflow",
        message=f"Extracted {len(data)} items",
        message_type="Info"
    ))
    
    data_dicts = [item.model_dump() for item in data]
    
    cli_log(CliLogData(
        action="S3Workflow",
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

s3_task = Task[None, None](
    name="s3-task",
    config=TaskConfig(run=run_task)
)

s3_workflow = Workflow(
    name="s3-workflow",
    config=WorkflowConfig(starting_task=s3_task)
)
