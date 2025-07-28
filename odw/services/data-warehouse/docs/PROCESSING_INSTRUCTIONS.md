# Processing Instructions System

The Processing Instructions System allows users to dynamically configure how data should be processed during workflow execution. This provides a flexible way to apply transformations, validations, and routing logic without modifying code.

## Overview

### Architecture
- **Instruction Store Service**: Thread-safe singleton service managing instructions in memory
- **API Endpoints**: REST APIs for submitting, listing, and managing instructions
- **Workflow Integration**: Workflows automatically apply relevant instructions during processing
- **Instruction Types**: Support for transformation, validation, and routing instructions

### Components

```
app/
├── services/
│   ├── instruction_store.py              # Core instruction store service
│   └── processing_instructions_examples.py # Usage examples
├── apis/
│   ├── submit_processing_instruction.py   # Submit new instructions
│   ├── get_processing_instructions.py     # List/query instructions
│   └── manage_processing_instructions.py  # Delete/clear/update instructions
└── unstructured_data/
    └── extract.py                        # Modified to use instructions
```

## Instruction Types

### 1. Transformation Instructions
Modify data content during processing.

**Example**: Add metadata fields to JSON data
```json
{
  "instruction_type": "transformation",
  "target_data_source": "unstructured_data",
  "content": {
    "json_transform": [
      {
        "type": "add_field",
        "field": "processing_timestamp",
        "value": "2024-01-01T00:00:00Z"
      },
      {
        "type": "rename_field",
        "old_field": "content",
        "new_field": "document_content"
      }
    ]
  },
  "priority": 5
}
```

### 2. Validation Instructions
Validate data and route invalid data to dead letter queue.

**Example**: Check for required fields
```json
{
  "instruction_type": "validation", 
  "target_data_source": "unstructured_data",
  "content": {
    "required_fields": ["title", "content", "author", "date_created"]
  },
  "priority": 10
}
```

### 3. Routing Instructions
Modify file paths or routing based on content.

**Example**: Route documents by type
```json
{
  "instruction_type": "routing",
  "target_data_source": "unstructured_data", 
  "content": {
    "route_by_content": [
      {
        "field": "document_type",
        "value": "invoice",
        "prefix": "financial/invoices/"
      }
    ]
  },
  "priority": 3
}
```

## API Usage

### Submit Processing Instruction
**Endpoint**: `POST /consumption/submitProcessingInstruction`

```json
{
  "instruction_type": "transformation",
  "target_data_source": "unstructured_data", 
  "content": {
    "json_transform": [...]
  },
  "priority": 5,
  "expires_in_minutes": 60
}
```

### List Processing Instructions
**Endpoint**: `GET /consumption/getProcessingInstructions`

Query parameters:
- `target_data_source`: Filter by data source
- `instruction_type`: Filter by instruction type
- `status`: Filter by status (pending, active, completed, expired)
- `include_expired`: Include expired instructions

### Manage Processing Instructions
**Endpoint**: `POST /consumption/manageProcessingInstructions`

**Delete instruction**:
```json
{
  "action": "delete",
  "instruction_id": "uuid-here"
}
```

**Clear instructions**:
```json
{
  "action": "clear",
  "target_data_source": "unstructured_data",
  "status": "completed"
}
```

**Update status**:
```json
{
  "action": "update_status",
  "instruction_id": "uuid-here",
  "status": "completed"
}
```

## Workflow Integration

Instructions are automatically applied during workflow execution:

1. **Workflow starts** → Queries instruction store for target data source
2. **Instructions applied** → In priority order (highest first) 
3. **Status tracking** → Instructions marked as active → completed
4. **Error handling** → Failed instructions logged, processing continues
5. **Dead letter queue** → Invalid data routed to DLQ for recovery

### Processing Order
1. **Validation** (typically priority 8-10) - Validate data first
2. **Transformation** (typically priority 3-7) - Transform valid data
3. **Routing** (typically priority 1-3) - Route transformed data

## Data Model

```python
class ProcessingInstruction(BaseModel):
    id: Key[str]                      # Unique identifier
    instruction_type: str             # "transformation", "validation", "routing"
    target_data_source: str           # "unstructured_data", "blob", "events", "logs"
    content: Dict[str, Any]           # Flexible instruction content
    priority: int = 1                 # Higher numbers = higher priority
    created_at: str                   # ISO timestamp when created
    expires_at: Optional[str] = None  # Optional expiration time
    status: str = "pending"           # "pending", "active", "completed", "expired"
```

## Thread Safety

The instruction store service is thread-safe and supports concurrent access:
- **Singleton pattern** ensures single instance across threads
- **RLock protection** for all data operations
- **Automatic cleanup** of expired instructions
- **Status tracking** prevents instruction conflicts

## Examples

See `app/services/processing_instructions_examples.py` for complete usage examples.

### Quick Start

1. **Submit an instruction**:
```bash
curl -X POST http://localhost:4200/consumption/submitProcessingInstruction \
  -H "Content-Type: application/json" \
  -d '{
    "instruction_type": "transformation",
    "target_data_source": "unstructured_data",
    "content": {"json_transform": [{"type": "add_field", "field": "processed", "value": true}]},
    "priority": 5
  }'
```

2. **Submit unstructured data**:
```bash
curl -X POST http://localhost:4200/consumption/submitUnstructuredData \
  -H "Content-Type: application/json" \
  -d '{
    "source_file_path": "/path/to/document.pdf",
    "extracted_data_json": "{\"title\": \"Sample Document\"}"
  }'
```

3. **Run the workflow**:
The workflow will automatically apply the transformation instruction to add the "processed" field.

4. **Check results**:
```bash
curl "http://localhost:4200/consumption/getUnstructuredData"
```

## Future Enhancements

- **Persistent Storage**: Redis/database backend for instruction durability
- **Conditional Logic**: More complex instruction conditions and branching
- **Bulk Operations**: Batch instruction management
- **Instruction Templates**: Reusable instruction patterns
- **Real-time Updates**: WebSocket notifications for instruction status changes 