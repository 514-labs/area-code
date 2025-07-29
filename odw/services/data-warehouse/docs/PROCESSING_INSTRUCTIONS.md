# Processing Instructions System

The Processing Instructions System allows users to dynamically configure how unstructured data should be processed and converted to structured data using natural language instructions that are interpreted by an LLM. This provides a flexible way to extract, validate, transform, and route data without modifying code.

## Overview

### Architecture
- **Instruction Store Service**: Thread-safe singleton service managing instructions in memory
- **API Endpoints**: REST APIs for submitting, listing, and managing instructions
- **Workflow Integration**: Workflows automatically apply relevant instructions during processing
- **LLM Interpretation**: Natural language instructions are interpreted by an LLM during processing
- **File Reading**: System reads raw file content from source_file_path
- **Instruction Types**: Support for extraction, validation, transformation, and routing instructions

### Workflow Process
1. **File Reading**: System reads unstructured files (PDF, images, text, etc.) from source_file_path
2. **Extraction**: LLM uses extraction instructions to convert unstructured content to structured JSON
3. **Post-Processing**: Validation, transformation, and routing instructions modify the extracted data
4. **Storage**: Final structured data is stored in UnstructuredData.extracted_data_json

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
├── utils/
│   └── file_reader.py                    # File reading utility for various formats
└── unstructured_data/
    └── extract.py                        # Modified to use instructions
```

## Instruction Types

### 1. Extraction Instructions ⭐ **PRIMARY**
Extract structured data from unstructured file content using natural language descriptions.

**Example**: Extract invoice data from PDF
```json
{
  "instruction_type": "extraction",
  "target_data_source": "unstructured_data",
  "content": "Extract the invoice number, invoice date, total amount, vendor name, and vendor address from this invoice document. If it's not an invoice, extract the document type, title, author, and date created."
}
```

### 2. Validation Instructions
Validate extracted data and route invalid data to dead letter queue using natural language criteria.

**Example**: Check for required fields
```json
{
  "instruction_type": "validation", 
  "target_data_source": "unstructured_data",
  "content": "Ensure that the extracted data contains the required fields: title, content, author, and date_created. If any of these fields are missing, mark the data as invalid and route it to the dead letter queue."
}
```

### 3. Transformation Instructions
Modify extracted data content during processing using natural language descriptions.

**Example**: Add metadata fields to JSON data
```json
{
  "instruction_type": "transformation",
  "target_data_source": "unstructured_data",
  "content": "Add a processing_timestamp field with the current date and time, rename the 'content' field to 'document_content', and add a 'data_source' field with the value 'document_processor'"
}
```

### 4. Routing Instructions
Modify file paths or routing based on extracted content using natural language rules.

**Example**: Route documents by type
```json
{
  "instruction_type": "routing",
  "target_data_source": "unstructured_data", 
  "content": "Based on the document_type field in the extracted data, add appropriate prefixes to the file path: 'financial/invoices/' for invoices, 'legal/contracts/' for contracts, and 'reports/' for reports. If the document_type doesn't match any of these categories, use 'misc/' as the prefix."
}
```

## API Usage

### Submit Processing Instruction
**Endpoint**: `POST /consumption/submitProcessingInstruction`

```json
{
  "instruction_type": "extraction",
  "target_data_source": "unstructured_data", 
  "content": "Extract invoice number, date, total amount, and vendor name from this invoice document",
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

The complete unstructured-to-structured workflow:

1. **File Reading** → System reads raw file content from source_file_path
2. **Extraction Phase** → LLM applies extraction instructions to generate structured JSON
3. **Post-Processing Phase** → Validation, transformation, and routing instructions modify extracted data
4. **Status tracking** → Instructions marked as active → completed
5. **Error handling** → Failed instructions logged, processing continues
6. **Dead letter queue** → Invalid data routed to DLQ for recovery

### Processing Order
1. **Extraction** (First) - Convert unstructured content to structured JSON
2. **Validation** (Second) - Validate extracted data
3. **Transformation** (Third) - Modify extracted data  
4. **Routing** (Last) - Route based on extracted content

Instructions within each phase are processed in creation order (oldest first).

## Data Model

```python
class ProcessingInstruction(BaseModel):
    id: Key[str]                      # Unique identifier
    instruction_type: str             # "extraction", "transformation", "validation", "routing"
    target_data_source: str           # "unstructured_data", "blob", "events", "logs"
    content: str                      # Natural language instruction for LLM interpretation
    created_at: str                   # ISO timestamp when created
    expires_at: Optional[str] = None  # Optional expiration time
    status: str = "pending"           # "pending", "active", "completed", "expired"
```

## File Types Supported

The system can read various file formats:
- **Text Files**: .txt, .md, .csv, .json, .xml, .html
- **PDF Files**: .pdf (requires integration with PyPDF2, pdfplumber, etc.)
- **Images**: .png, .jpg, .jpeg, .gif, .bmp (requires OCR integration)
- **Word Documents**: .doc, .docx (requires python-docx integration)

## Thread Safety

The instruction store service is thread-safe and supports concurrent access:
- **Singleton pattern** ensures single instance across threads
- **RLock protection** for all data operations
- **Automatic cleanup** of expired instructions
- **Status tracking** prevents instruction conflicts

## Examples

See `app/services/processing_instructions_examples.py` for complete usage examples.

### Quick Start

1. **Submit an extraction instruction**:
```bash
curl -X POST http://localhost:4200/consumption/submitProcessingInstruction \
  -H "Content-Type: application/json" \
  -d '{
    "instruction_type": "extraction",
    "target_data_source": "unstructured_data",
    "content": "Extract invoice number, date, total amount, and vendor name from this invoice document"
  }'
```

2. **Submit unstructured data** (file path only):
```bash
curl -X POST http://localhost:4200/consumption/submitUnstructuredData \
  -H "Content-Type: application/json" \
  -d '{
    "source_file_path": "/path/to/invoice.pdf",
    "extracted_data_json": ""
  }'
```

3. **Run the workflow**:
The workflow will automatically read the file, apply extraction instructions using LLM interpretation, then apply any post-processing instructions.

4. **Check results**:
```bash
curl "http://localhost:4200/consumption/getUnstructuredData"
```

## Future Enhancements

- **Persistent Storage**: Redis/database backend for instruction durability
- **Advanced LLM Integration**: Support for different LLM models and prompting strategies
- **Enhanced File Support**: Additional file format support (Excel, PowerPoint, etc.)
- **OCR Integration**: Tesseract, AWS Textract, or similar OCR services
- **PDF Processing**: PyPDF2, pdfplumber, or pymupdf integration
- **Instruction Templates**: Reusable natural language instruction patterns
- **Real-time Updates**: WebSocket notifications for instruction status changes
- **Instruction Validation**: LLM-based validation of instruction feasibility before execution 