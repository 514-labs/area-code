# LLM Extraction Improvements

## Overview

The LLM service has been enhanced to ensure that only the requested fields are returned during data extraction, preventing unwanted system fields from being included in the extracted data. Additionally, the system now supports image processing using LLM vision capabilities for OCR extraction.

## Problem Solved

Previously, the LLM sometimes returned structured data that included more fields than requested, such as:
- `extraction_method`
- `file_type` 
- `processed_at`
- `extraction_instruction`
- Other system-generated metadata

Additionally, image processing was not implemented, causing errors like:
```
"error": "Unable to extract data - OCR text extraction not implemented for image content"
```

## Solution

### 1. Enhanced Prompt Engineering

The extraction prompt has been improved with more explicit instructions:

```
CRITICAL REQUIREMENTS:
1. Return ONLY the specific data fields requested in the instruction
2. Do NOT add any additional fields, metadata, or explanatory text
3. Do NOT include fields like "extraction_method", "file_type", "processed_at", etc.
4. Do NOT add any system-generated fields
5. If certain information is not available in the content, omit those fields entirely
6. Do NOT guess or add placeholder values for missing information
7. Return a clean JSON object with ONLY the requested data
```

### 2. Response Filtering

The system now automatically filters out unwanted system fields from LLM responses:

```python
unwanted_fields = {
    'extraction_method', 'file_type', 'processed_at', 'extracted_at',
    'source_file_path', 'content_preview', 'extraction_instruction',
    'note', 'error', 'raw_response', 'extraction_error',
    'validation_message', 'transformation_note', 'transformation_instruction',
    'transformation_error', 'transformed_at', 'batch_id', 'processing_info'
}
```

### 3. Field Validation

A new validation system ensures that only the requested fields are returned:

- **LLM-based parsing**: Uses the LLM itself to parse processing instructions and identify expected fields
- **Heuristic fallback**: Simple pattern matching when LLM parsing is unavailable
- **Strict validation**: Optionally removes extra fields that weren't requested

### 4. Image Processing with LLM Vision

The system now supports image processing using modern multi-modal LLMs:

- **No external OCR libraries required**: Uses Claude's built-in vision capabilities
- **Base64 encoding**: Images are converted to base64 format for LLM processing
- **Automatic detection**: System detects image content and routes to vision processing
- **Structured extraction**: Extracts only the requested fields from images

### 5. Configuration Options

New environment variable to control validation behavior:

```bash
# Enable strict field validation (default: true)
LLM_STRICT_FIELD_VALIDATION=true
```

## Usage Examples

### Before (with extra fields)
```json
{
  "patient_name": "Michelle Clark",
  "phone_number": "555-269-5334",
  "extraction_method": "llm",
  "file_type": "text",
  "processed_at": "2025-01-08T10:30:00Z"
}
```

### After (clean data only)
```json
{
  "patient_name": "Michelle Clark", 
  "phone_number": "555-269-5334"
}
```

### Image Processing Example

When processing an image with the instruction "Extract patient name and phone number":

```json
{
  "patient_name": "John Smith",
  "phone_number": "555-123-4567"
}
```

## Testing

Run the test scripts to verify the improvements:

```bash
cd /path/to/data-warehouse

# Test general LLM extraction
python test_llm_extraction.py

# Test image extraction with vision
python test_image_extraction.py
```

The test scripts will:
- Test various extraction scenarios
- Verify that only requested fields are returned
- Validate the field filtering functionality
- Test image processing with LLM vision
- Show extraction performance metrics

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_STRICT_FIELD_VALIDATION` | `true` | Enable strict field validation |
| `ANTHROPIC_API_KEY` | Required | Your Anthropic API key |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | LLM model to use |
| `LLM_TEMPERATURE` | `0.1` | Temperature for extraction consistency |
| `LLM_MAX_TOKENS` | `4000` | Maximum tokens for responses |

### Example .env file

```bash
ANTHROPIC_API_KEY=your-api-key-here
LLM_STRICT_FIELD_VALIDATION=true
ANTHROPIC_MODEL=claude-sonnet-4-20250514
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=4000
```

## Supported File Types

All files must be stored in S3 and are processed via LLM capabilities:

### Text Files
- `.txt`, `.md`, `.csv`, `.json`, `.xml`, `.html`
- Processed using standard LLM text extraction

### Image Files
- `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`
- Processed using LLM vision capabilities
- No external OCR libraries required

### Document Files
- `.pdf` - Processed using LLM vision capabilities
- `.doc`, `.docx` - Processed using LLM document processing
- No external document parsing libraries required

### Architecture Simplifications
- **S3-Only**: All files must be in S3 (no local file system support)
- **LLM-Only**: All processing done via LLM (no external OCR/document libraries)
- **Unified Processing**: Same extraction pipeline for all file types

## Monitoring

The system logs validation warnings when extra fields are detected:

```
Field validation warning: Expected: ['patient_name', 'phone_number'], Got: ['patient_name', 'phone_number', 'extraction_method'], Missing: [], Extra: ['extraction_method']
Filtered out unwanted field 'extraction_method' from LLM response
```

For image processing:

```
Detected image content, using vision capabilities for OCR
Successfully processed image: image.png (2048 bytes, MIME: image/png)
Successfully extracted 2 fields from image
```

## Troubleshooting

### Disabling Strict Validation

If you need to allow extra fields for debugging:

```bash
LLM_STRICT_FIELD_VALIDATION=false
```

### Image Processing Issues

1. **Large images**: Very large images may exceed token limits
2. **Unsupported formats**: Ensure images are in supported formats (PNG, JPEG, GIF, BMP)
3. **Network issues**: Image processing requires stable internet connection for LLM API calls

### Viewing Validation Results

Check the logs for validation messages to understand what fields are being filtered.

### Performance Impact

The validation adds minimal overhead:
- LLM-based field parsing: ~100-200ms per extraction
- Heuristic parsing: <1ms per extraction
- Field filtering: <1ms per extraction
- Image processing: ~2-5s per image (depends on image size and complexity)

## Future Enhancements

- Custom field validation rules
- Field type validation
- Confidence scoring for extracted fields
- Batch validation optimization
- PDF text extraction
- Word document processing
- Video processing capabilities 