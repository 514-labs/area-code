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
    # Check for failure simulation
    if blob_source.file_name.startswith("[DLQ]"):
        raise ValueError(f"Transform failed for blob {blob_source.id}: File marked as failed")

    return Blob(
        id=blob_source.id,
        bucket_name=blob_source.bucket_name,
        file_path=blob_source.file_path,
        file_name=blob_source.file_name,
        file_size=blob_source.file_size,
        permissions=blob_source.permissions,
        content_type=blob_source.content_type,
        ingested_at=blob_source.ingested_at,
        transform_timestamp=datetime.now().isoformat()
    )

# Transform LogSource to Log, adding timestamp and handling failures
def log_source_to_log(log_source: LogSource) -> Log:
    # Check for failure simulation
    if log_source.message.startswith("[DLQ]"):
        raise ValueError(f"Transform failed for log {log_source.id}: Log marked as failed")

    return Log(
        id=log_source.id,
        timestamp=log_source.timestamp,
        level=log_source.level,
        message=log_source.message,
        source=log_source.source,
        trace_id=log_source.trace_id,
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

        # Fix the failure condition - change [DLQ] to [RECOVERED]
        corrected_file_name = original_blob_source.file_name
        if corrected_file_name.startswith("[DLQ]"):
            corrected_file_name = corrected_file_name.replace("[DLQ]", "[RECOVERED]", 1)

        return Blob(
            id=original_blob_source.id,
            bucket_name=original_blob_source.bucket_name,
            file_path=original_blob_source.file_path,
            file_name=corrected_file_name,
            file_size=original_blob_source.file_size,
            permissions=original_blob_source.permissions,
            content_type=original_blob_source.content_type,
            ingested_at=original_blob_source.ingested_at,
            transform_timestamp=datetime.now().isoformat()
        )
    except Exception as error:
        print(f"Blob recovery failed: {error}")
        return None

# Dead letter queue recovery for LogSource
def invalid_log_source_to_log(dead_letter: DeadLetterModel[LogSource]) -> Optional[Log]:
    try:
        original_log_source = dead_letter.as_typed()

        # Fix the failure condition - change [DLQ] to [RECOVERED]
        corrected_message = original_log_source.message
        if corrected_message.startswith("[DLQ]"):
            corrected_message = corrected_message.replace("[DLQ]", "[RECOVERED]", 1)

        return Log(
            id=original_log_source.id,
            timestamp=original_log_source.timestamp,
            level=original_log_source.level,
            message=corrected_message,
            source=original_log_source.source,
            trace_id=original_log_source.trace_id,
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