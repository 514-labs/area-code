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
                message_type="Warning"
            ))
            self.client = None
            self.enabled = False
            return
        
        try:
            self.client = anthropic.Anthropic(api_key=self.api_key)
            # Allow model configuration via environment variable
            self.model = os.getenv('ANTHROPIC_MODEL', "claude-sonnet-4-20250514")
            # Allow temperature configuration via environment variable
            self.temperature = float(os.getenv('LLM_TEMPERATURE', '0.1'))
            # Allow max tokens configuration via environment variable
            self.max_tokens = int(os.getenv('LLM_MAX_TOKENS', '4000'))
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
            # Build the prompt for extraction
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
        
        return f"""You are a data extraction specialist. Extract structured data from the following unstructured content based on the given instruction.

{file_info}

INSTRUCTION: {instruction}

CONTENT:
{content_preview}

Please extract the requested information and return it as a valid JSON object. Include only the data that can be reliably extracted from the content. If certain information is not available, omit those fields rather than guessing.

Return only the JSON object, no additional text or formatting."""
    
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
            # Try to parse as JSON
            extracted_data = json.loads(response_text.strip())
            
            # Add metadata
            extracted_data["extraction_instruction"] = instruction
            extracted_data["extracted_at"] = datetime.now().isoformat()
            extracted_data["extraction_method"] = "llm_anthropic"
            
            return extracted_data
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
    
    def _parse_routing_response(self, response_text: str, fallback_path: str) -> str:
        """Parse LLM routing response."""
        new_path = response_text.strip()
        
        # Basic validation - should be a reasonable file path
        if new_path and len(new_path) > 0 and not new_path.startswith("Error"):
            return new_path
        else:
            return fallback_path

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
                message_type="Warning"
            ))
            # Create a disabled instance to avoid repeated initialization attempts
            _llm_service_instance = LLMService.__new__(LLMService)
            _llm_service_instance.enabled = False
            _llm_service_instance.client = None
    return _llm_service_instance 