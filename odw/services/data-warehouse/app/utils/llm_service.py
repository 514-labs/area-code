import os
import json
from typing import Dict, Any, Optional, List
from moose_lib import cli_log, CliLogData
import anthropic
from datetime import datetime

class LLMService:
    """
    LLM Service for processing unstructured data using Anthropic's Claude API.
    Handles extraction, validation, transformation, and routing based on natural language instructions.
    """
    
    def __init__(self):
        """Initialize the LLM service with Anthropic client."""
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            cli_log(CliLogData(
                action="LLMService",
                message="ANTHROPIC_API_KEY not found. LLM features will be disabled. Set ANTHROPIC_API_KEY environment variable to enable LLM integration.",
                message_type="Info"
            ))
            self.client = None
            self.enabled = False
            # Define unwanted system fields even when disabled for consistency
            self.unwanted_fields = {
                'extraction_method', 'file_type', 'processed_at', 'extracted_at',
                'source_file_path', 'content_preview', 'extraction_instruction',
                'note', 'error', 'raw_response', 'extraction_error',
                'validation_message', 'transformation_note', 'transformation_instruction',
                'transformation_error', 'transformed_at', 'batch_id', 'processing_info'
            }
            self.strict_field_validation = False
            return
        
        try:
            self.client = anthropic.Anthropic(api_key=self.api_key)
            # Allow model configuration via environment variable
            self.model = os.getenv('ANTHROPIC_MODEL', "claude-sonnet-4-20250514")
            # Allow temperature configuration via environment variable
            self.temperature = float(os.getenv('LLM_TEMPERATURE', '0.1'))
            # Allow max tokens configuration via environment variable
            self.max_tokens = int(os.getenv('LLM_MAX_TOKENS', '4000'))
            # Allow strict field validation configuration via environment variable
            self.strict_field_validation = os.getenv('LLM_STRICT_FIELD_VALIDATION', 'true').lower() == 'true'
            # Define unwanted system fields that should be filtered out
            self.unwanted_fields = {
                'extraction_method', 'file_type', 'processed_at', 'extracted_at',
                'source_file_path', 'content_preview', 'extraction_instruction',
                'note', 'error', 'raw_response', 'extraction_error',
                'validation_message', 'transformation_note', 'transformation_instruction',
                'transformation_error', 'transformed_at', 'batch_id', 'processing_info'
            }
            self.enabled = True
            
            cli_log(CliLogData(
                action="LLMService",
                message=f"Initialized Anthropic LLM service successfully (model: {self.model})",
                message_type="Info"
            ))
        except Exception as e:
            cli_log(CliLogData(
                action="LLMService",
                message=f"Failed to initialize Anthropic client: {str(e)}",
                message_type="Error"
            ))
            self.client = None
            self.enabled = False
    
    def extract_structured_data_batch(
        self,
        batch_records: List[Dict[str, Any]],
        instruction: str
    ) -> List[Dict[str, Any]]:
        """
        Extract structured data from multiple files in a single LLM call for improved performance.
        
        Args:
            batch_records: List of record dictionaries, each containing:
                - file_content: Raw content from the file
                - file_type: Type of file (text, pdf, image, etc.)
                - file_path: File path for context
                - record_id: Unique identifier for mapping results back
            instruction: Natural language instruction for what to extract
            
        Returns:
            List of dictionaries with extracted structured data, maintaining order of input records
        """
        
        if not self.enabled:
            cli_log(CliLogData(
                action="LLMService",
                message="LLM service disabled - using fallback extraction for batch",
                message_type="Info"
            ))
            
            # Return basic extraction for each record without LLM
            return [
                {
                    "record_id": record.get("record_id", f"batch_{i}"),
                    "extraction_method": "fallback_no_llm",
                    "file_type": record.get("file_type", "unknown"),
                    "extraction_instruction": instruction,
                    "extracted_at": datetime.now().isoformat(),
                    "note": "LLM service not available - set ANTHROPIC_API_KEY to enable intelligent extraction"
                }
                for i, record in enumerate(batch_records)
            ]
        
        if not batch_records:
            return []
            
        # Use individual processing to prevent LLM hallucination issues observed in batch mode
        cli_log(CliLogData(
            action="LLMService",
            message=f"Processing {len(batch_records)} records individually to ensure accuracy",
            message_type="Info"
        ))
        
        # Process each record individually to prevent hallucination and data mixing
        return self._process_batch_individually(batch_records, instruction)

    def extract_structured_data(
        self, 
        file_content: str, 
        file_type: str, 
        instruction: str,
        file_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract structured data from unstructured content using natural language instruction.
        
        Args:
            file_content: Raw content from the file
            file_type: Type of file (text, pdf, image, etc.)
            instruction: Natural language instruction for what to extract
            file_path: Optional file path for context
            
        Returns:
            Dictionary with extracted structured data
        """
        
        if not self.enabled:
            cli_log(CliLogData(
                action="LLMService",
                message="LLM service disabled - using fallback extraction",
                message_type="Info"
            ))
            
            # Return basic extraction without LLM
            return {
                "extraction_method": "fallback_no_llm",
                "file_type": file_type,
                "content_preview": file_content[:500] + "..." if len(file_content) > 500 else file_content,
                "extraction_instruction": instruction,
                "extracted_at": datetime.now().isoformat(),
                "note": "LLM service not available - set ANTHROPIC_API_KEY to enable intelligent extraction"
            }
        
        cli_log(CliLogData(
            action="LLMService",
            message=f"Extracting data using instruction: {instruction[:100]}...",
            message_type="Info"
        ))
        
        try:
            # Check if this is image content that needs vision processing
            if self._is_image_content(file_content):
                cli_log(CliLogData(
                    action="LLMService",
                    message="Detected image content, using vision capabilities for OCR",
                    message_type="Info"
                ))
                return self._extract_from_image(file_content, instruction, file_path)
            
            # Check if this is document content (PDF/Word) that needs vision processing
            elif self._is_document_content(file_content):
                cli_log(CliLogData(
                    action="LLMService",
                    message="Detected document content, using vision capabilities for text extraction",
                    message_type="Info"
                ))
                return self._extract_from_document(file_content, instruction, file_path)
            
            # Build the prompt for text-based extraction
            prompt = self._build_extraction_prompt(file_content, file_type, instruction, file_path)
            
            # Call Anthropic API
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            # Parse the response
            response_text = response.content[0].text
            extracted_data = self._parse_extraction_response(response_text, instruction)
            
            # Validate that we got the expected fields (if strict validation is enabled)
            if self.strict_field_validation:
                validation_result = self._validate_extracted_fields(extracted_data, instruction)
                if not validation_result['is_valid']:
                    cli_log(CliLogData(
                        action="LLMService",
                        message=f"Field validation warning: {validation_result['message']}",
                        message_type="Info"
                    ))
                    
                    # If strict validation is enabled and we have extra fields, filter them out
                    if validation_result.get('extra_fields'):
                        cli_log(CliLogData(
                            action="LLMService",
                            message=f"Removing extra fields due to strict validation: {validation_result['extra_fields']}",
                            message_type="Info"
                        ))
                        
                        # Keep only the expected fields
                        expected_fields = validation_result.get('expected_fields', [])
                        if expected_fields:
                            filtered_data = {k: v for k, v in extracted_data.items() if k in expected_fields}
                            extracted_data = filtered_data
            
            cli_log(CliLogData(
                action="LLMService",
                message=f"Successfully extracted {len(extracted_data)} fields",
                message_type="Info"
            ))
            
            return extracted_data
            
        except Exception as e:
            cli_log(CliLogData(
                action="LLMService",
                message=f"LLM extraction failed: {str(e)}",
                message_type="Error"
            ))
            
            # Return error information but don't fail completely
            return {
                "extraction_error": str(e),
                "extraction_instruction": instruction,
                "file_type": file_type,
                "extracted_at": datetime.now().isoformat()
            }
    
    def validate_data(self, data_json: str, instruction: str) -> Dict[str, Any]:
        """
        Validate extracted data using natural language validation instruction.
        
        Args:
            data_json: JSON string of extracted data
            instruction: Natural language validation instruction
            
        Returns:
            Dictionary with validation results
        """
        
        if not self.enabled:
            cli_log(CliLogData(
                action="LLMService",
                message="LLM service disabled - skipping validation",
                message_type="Info"
            ))
            
            # Return basic validation result without LLM
            return {
                "is_valid": True,
                "validation_message": "LLM validation skipped - service not available",
                "validation_method": "fallback_no_llm",
                "validated_at": datetime.now().isoformat(),
                "note": "Set ANTHROPIC_API_KEY to enable intelligent validation"
            }
        
        cli_log(CliLogData(
            action="LLMService",
            message=f"Validating data using instruction: {instruction[:100]}...",
            message_type="Info"
        ))
        
        try:
            prompt = self._build_validation_prompt(data_json, instruction)
            
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                temperature=self.temperature,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            response_text = response.content[0].text
            validation_result = self._parse_validation_response(response_text)
            
            cli_log(CliLogData(
                action="LLMService",
                message=f"Validation result: {'PASS' if validation_result.get('is_valid') else 'FAIL'}",
                message_type="Info"
            ))
            
            return validation_result
            
        except Exception as e:
            cli_log(CliLogData(
                action="LLMService",
                message=f"LLM validation failed: {str(e)}",
                message_type="Error"
            ))
            
            return {
                "is_valid": False,
                "validation_error": str(e),
                "validated_at": datetime.now().isoformat()
            }
    
    def transform_data(self, data_json: str, instruction: str) -> str:
        """
        Transform extracted data using natural language transformation instruction.
        
        Args:
            data_json: JSON string of extracted data
            instruction: Natural language transformation instruction
            
        Returns:
            Transformed JSON string
        """
        
        if not self.enabled:
            cli_log(CliLogData(
                action="LLMService",
                message="LLM service disabled - skipping transformation",
                message_type="Info"
            ))
            
            # Return original data with note about disabled LLM
            try:
                data = json.loads(data_json)
                data["transformation_note"] = "LLM transformation skipped - service not available"
                data["transformation_instruction"] = instruction
                data["note"] = "Set ANTHROPIC_API_KEY to enable intelligent transformations"
                return json.dumps(data)
            except json.JSONDecodeError:
                return data_json
        
        cli_log(CliLogData(
            action="LLMService",
            message=f"Transforming data using instruction: {instruction[:100]}...",
            message_type="Info"
        ))
        
        try:
            prompt = self._build_transformation_prompt(data_json, instruction)
            
            response = self.client.messages.create(
                model=self.model,
                max_tokens=3000,
                temperature=self.temperature,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            response_text = response.content[0].text
            transformed_json = self._parse_transformation_response(response_text)
            
            cli_log(CliLogData(
                action="LLMService",
                message="Data transformation completed successfully",
                message_type="Info"
            ))
            
            return transformed_json
            
        except Exception as e:
            cli_log(CliLogData(
                action="LLMService",
                message=f"LLM transformation failed: {str(e)}",
                message_type="Error"
            ))
            
            # Return original data with error information
            try:
                original_data = json.loads(data_json)
                original_data["transformation_error"] = str(e)
                original_data["transformed_at"] = datetime.now().isoformat()
                return json.dumps(original_data)
            except:
                return data_json
    
    def route_data(self, data_json: str, current_path: str, instruction: str) -> str:
        """
        Determine routing for data using natural language routing instruction.
        
        Args:
            data_json: JSON string of extracted data
            current_path: Current file path
            instruction: Natural language routing instruction
            
        Returns:
            New file path with routing applied
        """
        
        if not self.enabled:
            cli_log(CliLogData(
                action="LLMService",
                message="LLM service disabled - skipping routing",
                message_type="Info"
            ))
            
            # Return original path when LLM is disabled
            return current_path
        
        cli_log(CliLogData(
            action="LLMService",
            message=f"Routing data using instruction: {instruction[:100]}...",
            message_type="Info"
        ))
        
        try:
            prompt = self._build_routing_prompt(data_json, current_path, instruction)
            
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=self.temperature,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            response_text = response.content[0].text
            new_path = self._parse_routing_response(response_text, current_path)
            
            cli_log(CliLogData(
                action="LLMService",
                message=f"Routing: {current_path} -> {new_path}",
                message_type="Info"
            ))
            
            return new_path
            
        except Exception as e:
            cli_log(CliLogData(
                action="LLMService",
                message=f"LLM routing failed: {str(e)}",
                message_type="Error"
            ))
            
            # Return original path if routing fails
            return current_path
    
    def _build_extraction_prompt(
        self, 
        file_content: str, 
        file_type: str, 
        instruction: str, 
        file_path: Optional[str] = None
    ) -> str:
        """Build prompt for data extraction."""
        
        file_info = f"File type: {file_type}"
        if file_path:
            file_info += f"\nFile path: {file_path}"
        
        # Limit content length to avoid token limits
        content_preview = file_content[:8000] + "..." if len(file_content) > 8000 else file_content
        
        return f"""You are a data extraction specialist. Carefully read the user's instruction and extract the requested information from the unstructured content.

{file_info}

INSTRUCTION: {instruction}

CONTENT:
{content_preview}

CRITICAL REQUIREMENTS:
1. Carefully analyze the user's instruction to understand what information they want extracted
2. Use descriptive field names that clearly represent what the user is asking for
3. Extract ALL information that matches what the user is requesting
4. For patient information, be especially careful to extract:
   - Full patient names (including first and last names)
   - Patient ages (look for numbers followed by "years", "yrs", "age", or similar)
   - Complete phone numbers (including area codes and extensions if present)
5. If the user asks for something like "the doctor who will be treating the patient", extract that information and use an appropriate field name
6. If the user asks for "scheduled appointment date", look for any date/time information related to appointments
7. Be thorough - if you see related information that the user likely wants, include it
8. Do NOT add system metadata like "extraction_method", "file_type", "processed_at", etc.
9. If certain requested information is not available in the content, omit those fields entirely
10. Do NOT guess or add placeholder values for missing information
11. Return a clean JSON object with the extracted data

RESPONSE FORMAT: Return ONLY a valid JSON object containing the extracted information, nothing else.

Think step by step:
- What specific information is the user asking for?
- What field names best represent their request?
- What information is actually present in the content?
- For patient data: Are there clear names, ages, and contact information visible?"""
    
    def _build_validation_prompt(self, data_json: str, instruction: str) -> str:
        """Build prompt for data validation."""
        
        return f"""You are a data validation specialist. Validate the following extracted data based on the given instruction.

INSTRUCTION: {instruction}

EXTRACTED DATA:
{data_json}

Please validate the data according to the instruction and respond with a JSON object containing:
- "is_valid": true/false
- "validation_message": explanation of validation result
- "missing_fields": list of any missing required fields
- "issues": list of any validation issues found

Return only the JSON object, no additional text."""
    
    def _build_transformation_prompt(self, data_json: str, instruction: str) -> str:
        """Build prompt for data transformation."""
        
        return f"""You are a data transformation specialist. Transform the following data based on the given instruction.

INSTRUCTION: {instruction}

CURRENT DATA:
{data_json}

Please apply the requested transformations and return the modified data as a valid JSON object. Make only the changes specified in the instruction.

Return only the transformed JSON object, no additional text."""
    
    def _build_routing_prompt(self, data_json: str, current_path: str, instruction: str) -> str:
        """Build prompt for data routing."""
        
        return f"""You are a data routing specialist. Determine the appropriate file path for the following data based on the given instruction.

INSTRUCTION: {instruction}

CURRENT PATH: {current_path}

DATA CONTENT:
{data_json}

Please determine the new file path based on the data content and routing instruction. Return only the new file path, no additional text or formatting."""
    
    def _parse_extraction_response(self, response_text: str, instruction: str) -> Dict[str, Any]:
        """Parse LLM extraction response into structured data."""
        try:
            # Clean the response text - remove markdown code blocks if present
            cleaned_text = response_text.strip()
            
            # Check if response is wrapped in markdown code blocks
            if cleaned_text.startswith("```json") and cleaned_text.endswith("```"):
                # Extract JSON from markdown code blocks
                json_start = cleaned_text.find("```json") + 7
                json_end = cleaned_text.rfind("```")
                if json_start < json_end:
                    cleaned_text = cleaned_text[json_start:json_end].strip()
            elif cleaned_text.startswith("```") and cleaned_text.endswith("```"):
                # Extract JSON from generic code blocks
                json_start = cleaned_text.find("```") + 3
                json_end = cleaned_text.rfind("```")
                if json_start < json_end:
                    cleaned_text = cleaned_text[json_start:json_end].strip()
            
            # Try to parse as JSON
            extracted_data = json.loads(cleaned_text)
            
            # Filter out unwanted system fields that might have been added by the LLM
            # Remove any unwanted fields that might have been added
            filtered_data = {}
            for key, value in extracted_data.items():
                if key not in self.unwanted_fields:
                    filtered_data[key] = value
                else:
                    cli_log(CliLogData(
                        action="LLMService",
                        message=f"Filtered out unwanted field '{key}' from LLM response",
                        message_type="Info"
                    ))
            
            # Return only the filtered LLM-extracted data
            # The system will add metadata at the database level if needed
            return filtered_data
            
        except json.JSONDecodeError:
            # If not valid JSON, return structured error
            return {
                "extraction_error": "Invalid JSON response from LLM",
                "raw_response": response_text[:500],
                "extraction_instruction": instruction,
                "extracted_at": datetime.now().isoformat()
            }
    
    def _parse_validation_response(self, response_text: str) -> Dict[str, Any]:
        """Parse LLM validation response."""
        try:
            return json.loads(response_text.strip())
        except json.JSONDecodeError:
            return {
                "is_valid": False,
                "validation_message": "Could not parse validation response",
                "raw_response": response_text[:200]
            }
    
    def _parse_transformation_response(self, response_text: str) -> str:
        """Parse LLM transformation response."""
        try:
            # Validate that it's proper JSON
            json.loads(response_text.strip())
            return response_text.strip()
        except json.JSONDecodeError:
            raise Exception("LLM returned invalid JSON for transformation")
    
    def _validate_extracted_fields(self, extracted_data: Dict[str, Any], instruction: str) -> Dict[str, Any]:
        """
        Validate that the extracted data contains only the expected fields based on the instruction.
        
        Args:
            extracted_data: The data extracted by the LLM
            instruction: The original processing instruction
            
        Returns:
            Dictionary with validation results
        """
        try:
            # Use LLM to parse the instruction and extract expected field names
            if self.enabled and self.client:
                expected_fields = self._extract_expected_fields_from_instruction(instruction)
            else:
                # Fallback to simple heuristic parsing
                expected_fields = self._parse_instruction_heuristic(instruction)
            
            # If we can't determine expected fields, assume the extraction is valid
            if not expected_fields:
                return {
                    'is_valid': True,
                    'message': 'Could not determine expected fields from instruction',
                    'extracted_fields': list(extracted_data.keys())
                }
            
            # Check if extracted data contains the expected fields
            extracted_fields = list(extracted_data.keys())
            missing_fields = [field for field in expected_fields if field not in extracted_fields]
            extra_fields = [field for field in extracted_fields if field not in expected_fields]
            
            is_valid = len(missing_fields) == 0 and len(extra_fields) == 0
            
            return {
                'is_valid': is_valid,
                'message': f"Expected: {expected_fields}, Got: {extracted_fields}, Missing: {missing_fields}, Extra: {extra_fields}",
                'expected_fields': expected_fields,
                'extracted_fields': extracted_fields,
                'missing_fields': missing_fields,
                'extra_fields': extra_fields
            }
            
        except Exception as e:
            return {
                'is_valid': True,  # Default to valid if validation fails
                'message': f'Field validation error: {str(e)}',
                'extracted_fields': list(extracted_data.keys())
            }
    
    def _extract_expected_fields_from_instruction(self, instruction: str) -> List[str]:
        """
        Use LLM to extract expected field names from the processing instruction.
        
        Args:
            instruction: The processing instruction
            
        Returns:
            List of expected field names
        """
        try:
            # Pre-process the instruction to handle common typos and variations
            processed_instruction = self._preprocess_instruction(instruction)
            
            prompt = f"""Analyze the following data extraction instruction and identify what information the user is asking for.

INSTRUCTION: {processed_instruction}

Based on the user's request, determine what fields should be extracted. Use descriptive field names that reflect what the user is asking for, using snake_case format.

Think about:
- What specific information is the user requesting?
- What are the key data points they want extracted?
- How would you naturally name these fields based on their request?

Return ONLY a JSON array of field names that should be extracted.

Example: If instruction asks for "Extract the patient's name, phone number, scheduled appointment date, dental procedure name, and the doctor who will be treating the patient", you might return:
["patient_name", "phone_number", "scheduled_appointment_date", "dental_procedure_name", "doctor_name"]

Return only the JSON array, no additional text."""
            
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.1,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = response.content[0].text.strip()
            
            # Parse the response
            if response_text.startswith("```json") and response_text.endswith("```"):
                json_start = response_text.find("```json") + 7
                json_end = response_text.rfind("```")
                if json_start < json_end:
                    response_text = response_text[json_start:json_end].strip()
            elif response_text.startswith("```") and response_text.endswith("```"):
                json_start = response_text.find("```") + 3
                json_end = response_text.rfind("```")
                if json_start < json_end:
                    response_text = response_text[json_start:json_end].strip()
            
            expected_fields = json.loads(response_text)
            if isinstance(expected_fields, list):
                return expected_fields
            else:
                return []
                
        except Exception as e:
            cli_log(CliLogData(
                action="LLMService",
                message=f"Failed to extract expected fields from instruction: {str(e)}",
                message_type="Info"
            ))
            return []
    
    def _preprocess_instruction(self, instruction: str) -> str:
        """
        Pre-process instruction to handle common typos and variations.
        
        Args:
            instruction: Original instruction
            
        Returns:
            Processed instruction
        """
        # Only fix obvious typos, don't force specific field names
        corrections = {
            "patient's phone name": "patient's name",  # Common typo
            "patient phone name": "patient's name"     # Common typo
        }
        
        processed_instruction = instruction
        for typo, correction in corrections.items():
            processed_instruction = processed_instruction.replace(typo, correction)
        
        return processed_instruction
    
    def _parse_instruction_heuristic(self, instruction: str) -> List[str]:
        """
        Parse instruction using simple heuristics to extract expected field names.
        
        Args:
            instruction: The processing instruction
            
        Returns:
            List of expected field names
        """
        instruction_lower = instruction.lower()
        
        # Common field patterns to look for in instructions
        field_indicators = [
            'extract', 'get', 'find', 'identify', 'locate', 'retrieve',
            'person_name', 'patient_name', 'phone_number', 'email', 'address', 'date',
            'appointment', 'doctor', 'procedure', 'time', 'location',
            'name', 'number', 'id', 'code', 'amount', 'price', 'cost', 'age'
        ]
        
        expected_fields = []
        for indicator in field_indicators:
            if indicator in instruction_lower:
                # Try to find the actual field name in context
                words = instruction_lower.split()
                for i, word in enumerate(words):
                    if indicator in word and i < len(words) - 1:
                        # Look for field names like "patient_name", "phone_number", etc.
                        if '_' in word or word in ['name', 'number', 'email', 'date', 'time']:
                            expected_fields.append(word)
        
        return expected_fields
    
    def _parse_routing_response(self, response_text: str, fallback_path: str) -> str:
        """Parse LLM routing response."""
        new_path = response_text.strip()
        
        # Basic validation - should be a reasonable file path
        if new_path and len(new_path) > 0 and not new_path.startswith("Error"):
            return new_path
        else:
            return fallback_path

    def _is_image_content(self, content: str) -> bool:
        """
        Detect if the content is image data (base64 encoded image).
        """
        return content.startswith("[IMAGE_DATA]data:image/") or content.startswith("data:image/")
    
    def _is_document_content(self, content: str) -> bool:
        """
        Detect if the content is document data (PDF or Word document).
        """
        return (content.startswith("[PDF_DATA]data:application/pdf") or 
                content.startswith("[DOC_DATA]data:application/") or
                content.startswith("data:application/pdf") or
                content.startswith("data:application/msword") or
                content.startswith("data:application/vnd.openxmlformats-officedocument"))
    
    def _extract_from_image(self, content: str, instruction: str, file_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Extract structured data from image content using Anthropic's vision capabilities.
        """
        try:
            # Extract the base64 image data from the content
            if content.startswith("[IMAGE_DATA]"):
                # Remove the [IMAGE_DATA] prefix
                image_data_url = content[12:]  # Remove "[IMAGE_DATA]" prefix
            else:
                image_data_url = content
            
            # Parse the data URL to get MIME type and base64 data
            if not image_data_url.startswith("data:"):
                raise Exception("Invalid image data format")
            
            # Extract MIME type and base64 data
            header_end = image_data_url.find(";base64,")
            if header_end == -1:
                raise Exception("Invalid image data URL format")
            
            mime_type = image_data_url[5:header_end]  # Remove "data:" prefix
            base64_data = image_data_url[header_end + 8:]  # Remove ";base64," prefix
            
            cli_log(CliLogData(
                action="LLMService",
                message=f"Processing image with MIME type: {mime_type}",
                message_type="Info"
            ))
            
            # Build the vision prompt for image extraction
            vision_prompt = self._build_vision_extraction_prompt(instruction, file_path)
            
            # Call Anthropic API with vision capabilities
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": vision_prompt
                            },
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": mime_type,
                                    "data": base64_data
                                }
                            }
                        ]
                    }
                ]
            )
            
            # Parse the response
            response_text = response.content[0].text
            extracted_data = self._parse_extraction_response(response_text, instruction)
            
            # Validate that we got the expected fields (if strict validation is enabled)
            if self.strict_field_validation:
                validation_result = self._validate_extracted_fields(extracted_data, instruction)
                if not validation_result['is_valid']:
                    cli_log(CliLogData(
                        action="LLMService",
                        message=f"Field validation warning: {validation_result['message']}",
                        message_type="Info"
                    ))
                    
                    # If strict validation is enabled and we have extra fields, filter them out
                    if validation_result.get('extra_fields'):
                        cli_log(CliLogData(
                            action="LLMService",
                            message=f"Removing extra fields due to strict validation: {validation_result['extra_fields']}",
                            message_type="Info"
                        ))
                        
                        # Keep only the expected fields
                        expected_fields = validation_result.get('expected_fields', [])
                        if expected_fields:
                            filtered_data = {k: v for k, v in extracted_data.items() if k in expected_fields}
                            extracted_data = filtered_data
            
            cli_log(CliLogData(
                action="LLMService",
                message=f"Successfully extracted {len(extracted_data)} fields from image",
                message_type="Info"
            ))
            
            return extracted_data
            
        except Exception as e:
            cli_log(CliLogData(
                action="LLMService",
                message=f"Image extraction failed: {str(e)}",
                message_type="Error"
            ))
            
            return {
                "extraction_error": f"Image processing failed: {str(e)}",
                "extraction_instruction": instruction,
                "file_type": "image",
                "extracted_at": datetime.now().isoformat()
            }
    
    def _extract_from_document(self, content: str, instruction: str, file_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Extract structured data from document content (PDF/Word) using Anthropic's vision capabilities.
        """
        try:
            # Extract the base64 document data from the content
            if content.startswith("[PDF_DATA]"):
                document_data_url = content[10:]  # Remove "[PDF_DATA]" prefix
                doc_type = "PDF"
            elif content.startswith("[DOC_DATA]"):
                document_data_url = content[10:]  # Remove "[DOC_DATA]" prefix
                doc_type = "Word Document"
            else:
                document_data_url = content
                doc_type = "Document"
            
            # Parse the data URL to get MIME type and base64 data
            if not document_data_url.startswith("data:"):
                raise Exception("Invalid document data format")
            
            # Extract MIME type and base64 data
            header_end = document_data_url.find(";base64,")
            if header_end == -1:
                raise Exception("Invalid document data URL format")
            
            mime_type = document_data_url[5:header_end]  # Remove "data:" prefix
            base64_data = document_data_url[header_end + 8:]  # Remove ";base64," prefix
            
            cli_log(CliLogData(
                action="LLMService",
                message=f"Processing {doc_type} with MIME type: {mime_type}",
                message_type="Info"
            ))
            
            # Build the vision prompt for document extraction
            vision_prompt = self._build_document_extraction_prompt(instruction, file_path, doc_type)
            
            # Call Anthropic API with vision capabilities
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": vision_prompt
                            },
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": mime_type,
                                    "data": base64_data
                                }
                            }
                        ]
                    }
                ]
            )
            
            # Parse the response
            response_text = response.content[0].text
            extracted_data = self._parse_extraction_response(response_text, instruction)
            
            # Validate that we got the expected fields (if strict validation is enabled)
            if self.strict_field_validation:
                validation_result = self._validate_extracted_fields(extracted_data, instruction)
                if not validation_result['is_valid']:
                    cli_log(CliLogData(
                        action="LLMService",
                        message=f"Field validation warning: {validation_result['message']}",
                        message_type="Info"
                    ))
                    
                    # If strict validation is enabled and we have extra fields, filter them out
                    if validation_result.get('extra_fields'):
                        cli_log(CliLogData(
                            action="LLMService",
                            message=f"Removing extra fields due to strict validation: {validation_result['extra_fields']}",
                            message_type="Info"
                        ))
                        
                        # Keep only the expected fields
                        expected_fields = validation_result.get('expected_fields', [])
                        if expected_fields:
                            filtered_data = {k: v for k, v in extracted_data.items() if k in expected_fields}
                            extracted_data = filtered_data
            
            cli_log(CliLogData(
                action="LLMService",
                message=f"Successfully extracted {len(extracted_data)} fields from {doc_type}",
                message_type="Info"
            ))
            
            return extracted_data
            
        except Exception as e:
            cli_log(CliLogData(
                action="LLMService",
                message=f"Document extraction failed: {str(e)}",
                message_type="Error"
            ))
            
            return {
                "extraction_error": f"Document processing failed: {str(e)}",
                "extraction_instruction": instruction,
                "file_type": "document",
                "extracted_at": datetime.now().isoformat()
            }
    
    def _build_document_extraction_prompt(self, instruction: str, file_path: Optional[str] = None, doc_type: str = "Document") -> str:
        """Build prompt for document-based data extraction."""
        
        file_info = ""
        if file_path:
            file_info = f"\nFile path: {file_path}"
        
        return f"""You are a data extraction specialist with document processing capabilities. Carefully read the user's instruction and extract the requested information from the {doc_type}.

{file_info}

INSTRUCTION: {instruction}

CRITICAL REQUIREMENTS:
1. Carefully analyze the user's instruction to understand what information they want extracted
2. Use descriptive field names that clearly represent what the user is asking for
3. Extract ALL information that matches what the user is requesting
4. For patient information, be especially careful to extract:
   - Full patient names (including first and last names)
   - Patient ages (look for numbers followed by "years", "yrs", "age", or similar)
   - Complete phone numbers (including area codes and extensions if present)
5. If the user asks for something like "the doctor who will be treating the patient", extract that information and use an appropriate field name
6. If the user asks for "scheduled appointment date", look for any date/time information related to appointments
7. Be thorough - if you see related information that the user likely wants, include it
8. Do NOT add system metadata like "extraction_method", "file_type", "processed_at", etc.
9. If certain requested information is not available in the document, omit those fields entirely
10. Do NOT guess or add placeholder values for missing information
11. Return a clean JSON object with the extracted data

RESPONSE FORMAT: Return ONLY a valid JSON object containing the extracted information, nothing else.

Think step by step:
- What specific information is the user asking for?
- What field names best represent their request?
- What information is actually present in the document?
- For patient data: Are there clear names, ages, and contact information visible?"""
    
    def _build_vision_extraction_prompt(self, instruction: str, file_path: Optional[str] = None) -> str:
        """Build prompt for vision-based data extraction."""
        
        file_info = ""
        if file_path:
            file_info = f"\nFile path: {file_path}"
        
        return f"""You are a data extraction specialist with vision capabilities. Carefully read the user's instruction and extract the requested information from the image.

{file_info}

INSTRUCTION: {instruction}

CRITICAL REQUIREMENTS:
1. Carefully analyze the user's instruction to understand what information they want extracted
2. Use descriptive field names that clearly represent what the user is asking for
3. Extract ALL information that matches what the user is requesting
4. For patient information, be especially careful to extract:
   - Full patient names (including first and last names)
   - Patient ages (look for numbers followed by "years", "yrs", "age", or similar)
   - Complete phone numbers (including area codes and extensions if present)
5. If the user asks for something like "the doctor who will be treating the patient", extract that information and use an appropriate field name
6. If the user asks for "scheduled appointment date", look for any date/time information related to appointments
7. Be thorough - if you see related information that the user likely wants, include it
8. Do NOT add system metadata like "extraction_method", "file_type", "processed_at", etc.
9. If certain requested information is not available in the image, omit those fields entirely
10. Do NOT guess or add placeholder values for missing information
11. Return a clean JSON object with the extracted data

RESPONSE FORMAT: Return ONLY a valid JSON object containing the extracted information, nothing else.

Think step by step:
- What specific information is the user asking for?
- What field names best represent their request?
- What information is actually present in the image?
- For patient data: Are there clear names, ages, and contact information visible?"""

    def _build_batch_extraction_prompt(self, batch_records: List[Dict[str, Any]], instruction: str) -> str:
        """Build prompt for batch data extraction."""
        
        # Limit content length per file to manage token usage
        max_content_per_file = int(os.getenv('LLM_MAX_CONTENT_PER_FILE', '2000'))
        
        files_section = ""
        for i, record in enumerate(batch_records, 1):
            file_content = record.get('file_content', '')
            file_path = record.get('file_path', f'file_{i}')
            record_id = record.get('record_id', f'record_{i}')
            
            # Truncate content if too long
            if len(file_content) > max_content_per_file:
                file_content = file_content[:max_content_per_file] + "..."
            
            files_section += f"""
FILE {i}:
Record ID: {record_id}
Path: {file_path}
Content:
{file_content}

"""
        
        return f"""You are a data extraction specialist. I will provide you with {len(batch_records)} files to process. For each file, extract the requested information according to the instruction below.

INSTRUCTION: {instruction}

{files_section}

CRITICAL REQUIREMENTS:
1. Process ALL {len(batch_records)} files provided above
2. For each file, extract the information according to the instruction
3. Use descriptive field names that clearly represent what is being asked for
4. Do NOT add system metadata like "extraction_method", "file_type", "processed_at", etc.
5. If certain requested information is not available in a file, omit those fields entirely
6. Do NOT guess or add placeholder values for missing information

RESPONSE FORMAT: Return a JSON array with exactly {len(batch_records)} objects, one for each file in order:
[
  {{"file_index": 1, "record_id": "{batch_records[0].get('record_id', 'record_1')}", "extracted_field1": "value1", "extracted_field2": "value2"}},
  {{"file_index": 2, "record_id": "{batch_records[1].get('record_id', 'record_2') if len(batch_records) > 1 else 'record_2'}", "extracted_field1": "value1", "extracted_field2": "value2"}},
  ...
]

Return ONLY the JSON array, no additional text or formatting."""

    def _parse_batch_extraction_response(self, response_text: str, batch_records: List[Dict[str, Any]], instruction: str) -> List[Dict[str, Any]]:
        """Parse LLM batch extraction response into structured data."""
        try:
            # Clean the response text - remove markdown code blocks if present
            cleaned_text = response_text.strip()
            
            if cleaned_text.startswith("```json") and cleaned_text.endswith("```"):
                json_start = cleaned_text.find("```json") + 7
                json_end = cleaned_text.rfind("```")
                if json_start < json_end:
                    cleaned_text = cleaned_text[json_start:json_end].strip()
            elif cleaned_text.startswith("```") and cleaned_text.endswith("```"):
                json_start = cleaned_text.find("```") + 3
                json_end = cleaned_text.rfind("```")
                if json_start < json_end:
                    cleaned_text = cleaned_text[json_start:json_end].strip()
            
            # Parse as JSON array
            batch_results = json.loads(cleaned_text)
            
            if not isinstance(batch_results, list):
                raise ValueError("Expected JSON array response")
            
            # Process and filter each result
            filtered_results = []
            for i, result in enumerate(batch_results):
                if not isinstance(result, dict):
                    # Create error result for invalid response
                    filtered_results.append({
                        "record_id": batch_records[i].get("record_id", f"batch_{i}") if i < len(batch_records) else f"batch_{i}",
                        "extraction_error": "Invalid result format in batch response",
                        "extraction_instruction": instruction,
                        "extracted_at": datetime.now().isoformat()
                    })
                    continue
                
                # Filter out unwanted system fields
                filtered_data = {}
                for key, value in result.items():
                    if key not in self.unwanted_fields:
                        filtered_data[key] = value
                
                # Ensure record_id is preserved
                if "record_id" not in filtered_data and i < len(batch_records):
                    filtered_data["record_id"] = batch_records[i].get("record_id", f"batch_{i}")
                
                filtered_results.append(filtered_data)
            
            # Handle case where we got fewer results than expected
            while len(filtered_results) < len(batch_records):
                missing_index = len(filtered_results)
                filtered_results.append({
                    "record_id": batch_records[missing_index].get("record_id", f"batch_{missing_index}"),
                    "extraction_error": "Missing result in batch response",
                    "extraction_instruction": instruction,
                    "extracted_at": datetime.now().isoformat()
                })
            
            return filtered_results[:len(batch_records)]  # Ensure we don't return more than we sent
            
        except json.JSONDecodeError as e:
            cli_log(CliLogData(
                action="LLMService",
                message=f"Failed to parse batch response as JSON: {str(e)}",
                message_type="Error"
            ))
            
            # Return error results for all records
            return [
                {
                    "record_id": record.get("record_id", f"batch_{i}"),
                    "extraction_error": f"Batch JSON parsing failed: {str(e)}",
                    "raw_response": response_text[:500],
                    "extraction_instruction": instruction,
                    "extracted_at": datetime.now().isoformat()
                }
                for i, record in enumerate(batch_records)
            ]
        except Exception as e:
            cli_log(CliLogData(
                action="LLMService",
                message=f"Failed to process batch response: {str(e)}",
                message_type="Error"
            ))
            
            # Return error results for all records
            return [
                {
                    "record_id": record.get("record_id", f"batch_{i}"),
                    "extraction_error": f"Batch processing failed: {str(e)}",
                    "extraction_instruction": instruction,
                    "extracted_at": datetime.now().isoformat()
                }
                for i, record in enumerate(batch_records)
            ]

    def _process_batch_individually(self, batch_records: List[Dict[str, Any]], instruction: str) -> List[Dict[str, Any]]:
        """Fall back to individual processing when batch processing fails."""
        
        cli_log(CliLogData(
            action="LLMService",
            message=f"Processing {len(batch_records)} records individually as fallback",
            message_type="Info"
        ))
        
        results = []
        for i, record in enumerate(batch_records):
            try:
                # Extract individual record data
                file_content = record.get('file_content', '')
                file_type = record.get('file_type', 'text')
                file_path = record.get('file_path')
                record_id = record.get('record_id', f'fallback_{i}')
                
                # Process individual record
                extracted_data = self.extract_structured_data(
                    file_content=file_content,
                    file_type=file_type,
                    instruction=instruction,
                    file_path=file_path
                )
                
                # Ensure record_id is included
                extracted_data["record_id"] = record_id
                results.append(extracted_data)
                
            except Exception as e:
                # Create error result for failed individual processing
                results.append({
                    "record_id": record.get("record_id", f"fallback_{i}"),
                    "extraction_error": f"Individual processing failed: {str(e)}",
                    "extraction_instruction": instruction,
                    "extracted_at": datetime.now().isoformat()
                })
        
        return results

    def _calculate_optimal_batch_size(self, batch_records: List[Dict[str, Any]]) -> int:
        """
        Calculate optimal batch size based on content length and token limits.
        
        Args:
            batch_records: List of records to be processed
            
        Returns:
            Optimal batch size for the given records
        """
        # Get configuration from environment variables
        max_batch_size = int(os.getenv('LLM_MAX_BATCH_SIZE', '10'))
        min_batch_size = int(os.getenv('LLM_MIN_BATCH_SIZE', '1'))
        max_tokens_per_request = int(os.getenv('LLM_MAX_TOKENS_PER_REQUEST', '4000'))
        max_content_per_file = int(os.getenv('LLM_MAX_CONTENT_PER_FILE', '2000'))
        
        # If we have fewer records than max batch size, use all records
        if len(batch_records) <= max_batch_size:
            return len(batch_records)
        
        # Calculate average content length
        total_content_length = 0
        valid_records = 0
        
        for record in batch_records:
            content = record.get('file_content', '')
            if content:
                total_content_length += len(content)
                valid_records += 1
        
        if valid_records == 0:
            return min_batch_size
        
        avg_content_length = total_content_length / valid_records
        
        # Rough estimation: 1 token ≈ 4 characters for English text
        # Add overhead for instruction and formatting (approximately 500 tokens)
        estimated_tokens_per_file = (min(avg_content_length, max_content_per_file) / 4) + 100
        instruction_overhead = 500
        
        # Calculate how many files we can fit in one request
        available_tokens = max_tokens_per_request - instruction_overhead
        estimated_max_files = max(1, int(available_tokens / estimated_tokens_per_file))
        
        # Use the smaller of max_batch_size and estimated_max_files
        optimal_size = min(max_batch_size, estimated_max_files)
        
        # Ensure we don't go below minimum
        optimal_size = max(min_batch_size, optimal_size)
        
        cli_log(CliLogData(
            action="LLMService",
            message=f"Calculated optimal batch size: {optimal_size} (avg content: {avg_content_length:.0f} chars, estimated tokens per file: {estimated_tokens_per_file:.0f})",
            message_type="Info"
        ))
        
        return optimal_size

    def _estimate_prompt_tokens(self, batch_records: List[Dict[str, Any]], instruction: str) -> int:
        """
        Estimate the total number of tokens for a batch prompt.
        
        Args:
            batch_records: List of records to be processed
            instruction: Processing instruction
            
        Returns:
            Estimated token count
        """
        max_content_per_file = int(os.getenv('LLM_MAX_CONTENT_PER_FILE', '2000'))
        
        # Estimate instruction tokens
        instruction_tokens = len(instruction) / 4
        
        # Estimate content tokens
        content_tokens = 0
        for record in batch_records:
            content = record.get('file_content', '')
            # Truncate content as we would in the actual prompt
            truncated_content = content[:max_content_per_file] if len(content) > max_content_per_file else content
            content_tokens += len(truncated_content) / 4
        
        # Add overhead for formatting, file headers, JSON structure, etc.
        formatting_overhead = len(batch_records) * 50  # ~50 tokens per file for headers and structure
        
        total_estimated_tokens = instruction_tokens + content_tokens + formatting_overhead
        
        cli_log(CliLogData(
            action="LLMService",
            message=f"Estimated token usage: {total_estimated_tokens:.0f} tokens for {len(batch_records)} files",
            message_type="Info"
        ))
        
        return int(total_estimated_tokens)

# Singleton instance
_llm_service_instance = None

def get_llm_service() -> LLMService:
    """Get singleton LLM service instance."""
    global _llm_service_instance
    if _llm_service_instance is None:
        try:
            _llm_service_instance = LLMService()
        except Exception as e:
            cli_log(CliLogData(
                action="LLMService",
                message=f"Failed to initialize LLM service: {str(e)}. Creating disabled instance.",
                message_type="Info"
            ))
            # Create a disabled instance to avoid repeated initialization attempts
            _llm_service_instance = LLMService.__new__(LLMService)
            _llm_service_instance.enabled = False
            _llm_service_instance.client = None
    return _llm_service_instance 