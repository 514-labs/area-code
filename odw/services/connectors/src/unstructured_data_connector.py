from typing import List, TypeVar, Generic, Optional
from .random import UnstructuredDataSource
from datetime import datetime
import json
import uuid

T = TypeVar('T')

class UnstructuredDataConnectorConfig:
    def __init__(self, batch_size: Optional[int] = None):
        self.batch_size = batch_size

class UnstructuredDataConnector(Generic[T]):
    def __init__(self, config: UnstructuredDataConnectorConfig):
        self._batch_size = config.batch_size or 1000
        self._pending_data: List[UnstructuredDataSource] = []

    def submit_data(self, source_file_path: str, extracted_data_json: Optional[str] = None, processing_instructions: Optional[str] = None) -> str:
        """
        Submit processed unstructured data for ingestion.
        
        Args:
            source_file_path: Path to the original unstructured file
            extracted_data_json: Optional JSON string containing extracted structured data
            processing_instructions: Optional instructions for processing the data
            
        Returns:
            The ID of the submitted data record
        """
        # Validate JSON only if provided
        if extracted_data_json is not None:
            try:
                json.loads(extracted_data_json)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON in extracted_data_json: {e}")
        
        data_id = str(uuid.uuid4())
        unstructured_data = UnstructuredDataSource(
            id=data_id,
            source_file_path=source_file_path,
            extracted_data_json=extracted_data_json,
            processed_at=datetime.now().isoformat(),
            processing_instructions=processing_instructions
        )
        
        self._pending_data.append(unstructured_data)
        return data_id

    def extract(self) -> List[UnstructuredDataSource]:
        """
        Extract pending unstructured data. Unlike other connectors, this doesn't generate
        random data but returns user-submitted data.
        
        Returns:
            List of pending UnstructuredDataSource objects
        """
        print(f"Extracting {len(self._pending_data)} unstructured data items")
        
        # Return pending data and clear the queue
        data = self._pending_data[:self._batch_size]
        self._pending_data = self._pending_data[self._batch_size:]
        
        return data

    def has_pending_data(self) -> bool:
        """Check if there is pending data to extract."""
        return len(self._pending_data) > 0

    def get_pending_count(self) -> int:
        """Get the number of pending data items."""
        return len(self._pending_data) 