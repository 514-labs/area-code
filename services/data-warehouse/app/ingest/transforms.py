from app.ingest.models import (
    blobSourceModel, logSourceModel, blobModel, logModel,
    BlobSource, LogSource, Blob, Log
)
from moose_lib import DeadLetterModel, TransformConfig
from datetime import datetime
from typing import Optional

# This defines how data can be transformed from one model to another.
# For more information on transformations, see: https://docs.fiveonefour.com/moose/building/streams.

# Transform BlobSource to Blob, adding timestamp and handling failures
def blob_source_to_blob(blob_source: BlobSource) -> Blob:
    if "fail" in blob_source.tags:
        raise ValueError(f"Transform failed for blob {blob_source.id}: Item marked as failed")

    return Blob(
        id=blob_source.id,
        name=blob_source.name,
        description=blob_source.description,
        status=blob_source.status,
        priority=blob_source.priority,
        is_active=blob_source.is_active,
        tags=blob_source.tags,
        score=blob_source.score,
        large_text=blob_source.large_text,
        transform_timestamp=datetime.now().isoformat()
    )

# Transform LogSource to Log, adding timestamp and handling failures
def log_source_to_log(log_source: LogSource) -> Log:
    if "fail" in log_source.tags:
        raise ValueError(f"Transform failed for log {log_source.id}: Item marked as failed")

    return Log(
        id=log_source.id,
        name=log_source.name,
        description=log_source.description,
        status=log_source.status,
        priority=log_source.priority,
        is_active=log_source.is_active,
        tags=log_source.tags,
        score=log_source.score,
        large_text=log_source.large_text,
        transform_timestamp=datetime.now().isoformat()
    )

# Set up the transformations
blobSourceModel.get_stream().add_transform(
    destination=blobModel.get_stream(),
    transformation=blob_source_to_blob,
    config=TransformConfig(
        dead_letter_queue=blobSourceModel.get_dead_letter_queue()
    )
)

logSourceModel.get_stream().add_transform(
    destination=logModel.get_stream(),
    transformation=log_source_to_log,
    config=TransformConfig(
        dead_letter_queue=logSourceModel.get_dead_letter_queue()
    )
)

# Dead letter queue recovery for BlobSource
def invalid_blob_source_to_blob(dead_letter: DeadLetterModel[BlobSource]) -> Optional[Blob]:
    try:
        original_blob_source = dead_letter.as_typed()

        if "Item marked as failed" in dead_letter.error_message and "fail" in original_blob_source.tags:
            original_blob_source.tags.remove("fail")

        return Blob(
            id=original_blob_source.id,
            name=original_blob_source.name,
            description=original_blob_source.description,
            status=original_blob_source.status,
            priority=original_blob_source.priority,
            is_active=original_blob_source.is_active,
            tags=original_blob_source.tags,
            score=original_blob_source.score,
            large_text=original_blob_source.large_text,
            transform_timestamp=datetime.now().isoformat()
        )
    except Exception as error:
        print(f"Blob recovery failed: {error}")
        return None

# Dead letter queue recovery for LogSource
def invalid_log_source_to_log(dead_letter: DeadLetterModel[LogSource]) -> Optional[Log]:
    try:
        original_log_source = dead_letter.as_typed()

        if "Item marked as failed" in dead_letter.error_message and "fail" in original_log_source.tags:
            original_log_source.tags.remove("fail")

        return Log(
            id=original_log_source.id,
            name=original_log_source.name,
            description=original_log_source.description,
            status=original_log_source.status,
            priority=original_log_source.priority,
            is_active=original_log_source.is_active,
            tags=original_log_source.tags,
            score=original_log_source.score,
            large_text=original_log_source.large_text,
            transform_timestamp=datetime.now().isoformat()
        )
    except Exception as error:
        print(f"Log recovery failed: {error}")
        return None

# Set up dead letter queue transforms
blobSourceModel.get_dead_letter_queue().add_transform(
    destination=blobModel.get_stream(),
    transformation=invalid_blob_source_to_blob,
)

logSourceModel.get_dead_letter_queue().add_transform(
    destination=logModel.get_stream(),
    transformation=invalid_log_source_to_log,
)