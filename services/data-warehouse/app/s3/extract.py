from moose_lib import Task, TaskConfig, Workflow, WorkflowConfig, cli_log, CliLogData
from app.connectors.connector_factory import ConnectorFactory, ConnectorType
from app.connectors.s3connector import S3ConnectorConfig
from app.ingest.models import Foo

def run_task() -> None:
    cli_log(CliLogData(action="S3Workflow", message="Running S3 task...", message_type="Info"))

    connector = ConnectorFactory[Foo].create(
        ConnectorType.S3,
        S3ConnectorConfig(batch_size=500)
    )

    data = connector.extract()

    cli_log(CliLogData(
        action="S3Workflow",
        message=f"Extracted {len(data)} items",
        message_type="Info"
    ))

s3_task = Task[None, None](
    name="s3-task",
    config=TaskConfig(run=run_task)
)

s3_workflow = Workflow(
    name="s3-workflow",
    config=WorkflowConfig(starting_task=s3_task)
)
