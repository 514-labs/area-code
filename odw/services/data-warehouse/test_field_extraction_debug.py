#!/usr/bin/env python3
"""
Debug script to test field extraction logic and understand why certain fields are being missed.
"""

import os
import sys
import json
from datetime import datetime

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.utils.llm_service import LLMService

def test_instruction_parsing():
    """Test how the instruction parsing works with the problematic instruction."""
    
    print("🔍 Testing Instruction Parsing")
    print("=" * 40)
    
    # The problematic instruction from the user
    instruction = "Extract the patient's phone name, phone number, scheduled appointment date, dental procedure name, and the doctor who will be treating the patient."
    
    print(f"Original instruction: {instruction}")
    print()
    
    # Initialize LLM service
    llm_service = LLMService()
    
    if not llm_service.enabled:
        print("❌ LLM service is disabled. Set ANTHROPIC_API_KEY to run tests.")
        return
    
    # Test LLM-based field extraction
    print("📋 Testing LLM-based field extraction:")
    try:
        expected_fields = llm_service._extract_expected_fields_from_instruction(instruction)
        print(f"   LLM extracted fields: {expected_fields}")
    except Exception as e:
        print(f"   ❌ LLM extraction failed: {str(e)}")
    
    # Test heuristic field extraction
    print("\n📋 Testing heuristic field extraction:")
    try:
        heuristic_fields = llm_service._parse_instruction_heuristic(instruction)
        print(f"   Heuristic extracted fields: {heuristic_fields}")
    except Exception as e:
        print(f"   ❌ Heuristic extraction failed: {str(e)}")
    
    print()

def test_extraction_with_sample_data():
    """Test the full extraction process with sample data."""
    
    print("🧪 Testing Full Extraction Process")
    print("=" * 45)
    
    llm_service = LLMService()
    
    if not llm_service.enabled:
        print("❌ LLM service is disabled. Set ANTHROPIC_API_KEY to run tests.")
        return
    
    # Sample data similar to what was shown in the image
    sample_content = """Memo to: Dr. Hall
From: Reception
Date: July 30, 2025

Patient Donald Jones, 43 years old, has scheduled an appointment for cosmetic dental work on August 24, 2025 at 12:45 PM. Patient's contact number is 555.812.7944.

Please confirm this appointment."""
    
    instruction = "Extract the patient's phone name, phone number, scheduled appointment date, dental procedure name, and the doctor who will be treating the patient."
    
    print(f"Sample content: {sample_content}")
    print(f"Instruction: {instruction}")
    print()
    
    try:
        # Perform extraction
        start_time = datetime.now()
        extracted_data = llm_service.extract_structured_data(
            file_content=sample_content,
            file_type='text',
            instruction=instruction
        )
        end_time = datetime.now()
        
        print(f"⏱️  Extraction time: {(end_time - start_time).total_seconds():.2f}s")
        print(f"📊 Extracted data: {extracted_data}")
        print()
        
        # Test field validation
        print("🔍 Testing field validation:")
        validation_result = llm_service._validate_extracted_fields(extracted_data, instruction)
        print(f"   Validation result: {validation_result}")
        
    except Exception as e:
        print(f"❌ Extraction failed: {str(e)}")

def test_instruction_correction():
    """Test with corrected instruction to see if that helps."""
    
    print("\n🔧 Testing with Corrected Instruction")
    print("=" * 40)
    
    llm_service = LLMService()
    
    if not llm_service.enabled:
        print("❌ LLM service is disabled. Set ANTHROPIC_API_KEY to run tests.")
        return
    
    # Corrected instruction (fixed "phone name" to "name")
    corrected_instruction = "Extract the patient's name, phone number, scheduled appointment date, dental procedure name, and the doctor who will be treating the patient."
    
    sample_content = """Memo to: Dr. Hall
From: Reception
Date: July 30, 2025

Patient Donald Jones, 43 years old, has scheduled an appointment for cosmetic dental work on August 24, 2025 at 12:45 PM. Patient's contact number is 555.812.7944.

Please confirm this appointment."""
    
    print(f"Corrected instruction: {corrected_instruction}")
    print()
    
    try:
        # Test field extraction with corrected instruction
        expected_fields = llm_service._extract_expected_fields_from_instruction(corrected_instruction)
        print(f"Expected fields: {expected_fields}")
        
        # Perform extraction with corrected instruction
        extracted_data = llm_service.extract_structured_data(
            file_content=sample_content,
            file_type='text',
            instruction=corrected_instruction
        )
        
        print(f"Extracted data: {extracted_data}")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")

if __name__ == "__main__":
    # Run tests
    test_instruction_parsing()
    test_extraction_with_sample_data()
    test_instruction_correction()
    
    print("🏁 Field extraction debugging completed!") 