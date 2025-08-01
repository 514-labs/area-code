from app.ingest.models import (
    blobSourceModel, logSourceModel, eventSourceModel, unstructuredDataSourceModel,
    blobModel, logModel, eventModel, unstructuredDataModel, medicalModel,
    BlobSource, LogSource, EventSource, UnstructuredDataSource,
    Blob, Log, Event, UnstructuredData, Medical
)
from moose_lib import DeadLetterModel, TransformConfig
from datetime import datetime
from typing import Optional
import json

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

# Transform EventSource to Event, adding timestamp and handling failures
def event_source_to_event(event_source: EventSource) -> Event:
    # Check for failure simulation (events with [DLQ] in distinct_id)
    if event_source.distinct_id.startswith("[DLQ]"):
        raise ValueError(f"Transform failed for event {event_source.id}: Event marked as failed")

    return Event(
        id=event_source.id,
        event_name=event_source.event_name,
        timestamp=event_source.timestamp,
        distinct_id=event_source.distinct_id,
        session_id=event_source.session_id,
        project_id=event_source.project_id,
        properties=event_source.properties,
        ip_address=event_source.ip_address,
        user_agent=event_source.user_agent,
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

eventSourceModel.get_stream().add_transform(
    destination=eventModel.get_stream(),
    transformation=event_source_to_event,
    config=TransformConfig(
        dead_letter_queue=eventSourceModel.get_dead_letter_queue()
    )
    )

# Transform UnstructuredDataSource to UnstructuredData, adding timestamp
def unstructured_data_source_to_unstructured_data(source: UnstructuredDataSource) -> UnstructuredData:
    # Check for failure simulation
    if source.source_file_path.startswith("[DLQ]"):
        raise ValueError(f"Transform failed for unstructured data {source.id}: File marked as failed")

    return UnstructuredData(
        id=source.id,
        source_file_path=source.source_file_path,
        extracted_data=source.extracted_data,
        processed_at=source.processed_at,
        processing_instructions=source.processing_instructions,
        transform_timestamp=datetime.now().isoformat()
    )

unstructuredDataSourceModel.get_stream().add_transform(
    destination=unstructuredDataModel.get_stream(),
    transformation=unstructured_data_source_to_unstructured_data,
    config=TransformConfig(
        dead_letter_queue=unstructuredDataSourceModel.get_dead_letter_queue()
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

# Dead letter queue recovery for EventSource
def invalid_event_source_to_event(dead_letter: DeadLetterModel[EventSource]) -> Optional[Event]:
    try:
        original_event_source = dead_letter.as_typed()

        # Fix the failure condition - change [DLQ] to [RECOVERED]
        corrected_distinct_id = original_event_source.distinct_id
        if corrected_distinct_id.startswith("[DLQ]"):
            corrected_distinct_id = corrected_distinct_id.replace("[DLQ]", "[RECOVERED]", 1)

        return Event(
            id=original_event_source.id,
            event_name=original_event_source.event_name,
            timestamp=original_event_source.timestamp,
            distinct_id=corrected_distinct_id,
            session_id=original_event_source.session_id,
            project_id=original_event_source.project_id,
            properties=original_event_source.properties,
            ip_address=original_event_source.ip_address,
            user_agent=original_event_source.user_agent,
            ingested_at=original_event_source.ingested_at,
            transform_timestamp=datetime.now().isoformat()
        )
    except Exception as error:
        print(f"Event recovery failed: {error}")
        return None

# Dead letter queue recovery for UnstructuredDataSource
def invalid_unstructured_data_source_to_unstructured_data(dead_letter: DeadLetterModel[UnstructuredDataSource]) -> Optional[UnstructuredData]:
    try:
        original_source = dead_letter.as_typed()

        # Fix the failure condition - change [DLQ] to [RECOVERED]
        corrected_file_path = original_source.source_file_path
        if corrected_file_path.startswith("[DLQ]"):
            corrected_file_path = corrected_file_path.replace("[DLQ]", "[RECOVERED]", 1)

        return UnstructuredData(
            id=original_source.id,
            source_file_path=corrected_file_path,
            extracted_data=original_source.extracted_data,
            processed_at=original_source.processed_at,
            processing_instructions=original_source.processing_instructions,
            transform_timestamp=datetime.now().isoformat()
        )
    except Exception as error:
        print(f"UnstructuredData recovery failed: {error}")
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

eventSourceModel.get_dead_letter_queue().add_transform(
    destination=eventModel.get_stream(),
    transformation=invalid_event_source_to_event,
)

unstructuredDataSourceModel.get_dead_letter_queue().add_transform(
    destination=unstructuredDataModel.get_stream(),
    transformation=invalid_unstructured_data_source_to_unstructured_data,
)

