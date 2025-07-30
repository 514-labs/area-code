#!/usr/bin/env python3
"""
Test script to verify LLM extraction improvements.
This script tests that the LLM service only returns the requested fields.
"""

import os
import sys
import json
from datetime import datetime

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.utils.llm_service import LLMService

def test_llm_extraction():
    """Test LLM extraction with various instructions to ensure only requested fields are returned."""
    
    print("🧪 Testing LLM Extraction Improvements")
    print("=" * 50)
    
    # Initialize LLM service
    llm_service = LLMService()
    
    if not llm_service.enabled:
        print("❌ LLM service is disabled. Set ANTHROPIC_API_KEY to run tests.")
        return
    
    print(f"✅ LLM service initialized with model: {llm_service.model}")
    print(f"✅ Strict field validation: {llm_service.strict_field_validation}")
    print()
    
    # Test cases with different instructions
    test_cases = [
        {
            "name": "Patient Information Extraction",
            "content": "Patient: Michelle Clark\nPhone: 555-269-5334\nAppointment: 08/01/2025 at 1:30 PM\nProcedure: Cavity filling\nDoctor: Dr. Harris",
            "instruction": "Extract patient name and phone number",
            "expected_fields": ["patient_name", "phone_number"]
        },
        {
            "name": "Appointment Details",
            "content": "Patient: Michelle Clark\nPhone: 555-269-5334\nAppointment: 08/01/2025 at 1:30 PM\nProcedure: Cavity filling\nDoctor: Dr. Harris",
            "instruction": "Extract appointment date and doctor name",
            "expected_fields": ["appointment_date", "doctor"]
        },
        {
            "name": "Complete Patient Record",
            "content": "Patient: Michelle Clark\nPhone: 555-269-5334\nAppointment: 08/01/2025 at 1:30 PM\nProcedure: Cavity filling\nDoctor: Dr. Harris",
            "instruction": "Extract all patient information including name, phone, appointment date, procedure, and doctor",
            "expected_fields": ["patient_name", "phone_number", "appointment_date", "procedure", "doctor"]
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"📋 Test {i}: {test_case['name']}")
        print(f"   Instruction: {test_case['instruction']}")
        print(f"   Expected fields: {test_case['expected_fields']}")
        
        try:
            # Perform extraction
            start_time = datetime.now()
            extracted_data = llm_service.extract_structured_data(
                file_content=test_case['content'],
                file_type='text',
                instruction=test_case['instruction']
            )
            end_time = datetime.now()
            
            # Analyze results
            extracted_fields = list(extracted_data.keys())
            extra_fields = [field for field in extracted_fields if field not in test_case['expected_fields']]
            missing_fields = [field for field in test_case['expected_fields'] if field not in extracted_fields]
            
            print(f"   ⏱️  Extraction time: {(end_time - start_time).total_seconds():.2f}s")
            print(f"   📊 Extracted fields: {extracted_fields}")
            
            if extra_fields:
                print(f"   ⚠️  Extra fields found: {extra_fields}")
            else:
                print(f"   ✅ No extra fields")
                
            if missing_fields:
                print(f"   ❌ Missing fields: {missing_fields}")
            else:
                print(f"   ✅ All expected fields present")
            
            # Show extracted data
            print(f"   📄 Extracted data:")
            for key, value in extracted_data.items():
                print(f"      {key}: {value}")
            
            print()
            
        except Exception as e:
            print(f"   ❌ Test failed: {str(e)}")
            print()

def test_field_validation():
    """Test the field validation functionality."""
    
    print("🔍 Testing Field Validation")
    print("=" * 30)
    
    llm_service = LLMService()
    
    if not llm_service.enabled:
        print("❌ LLM service is disabled. Skipping validation tests.")
        return
    
    # Test validation with sample data
    test_instruction = "Extract patient name and phone number"
    test_data = {
        "patient_name": "John Doe",
        "phone_number": "555-1234",
        "extra_field": "should_not_be_here",
        "another_extra": "also_should_not_be_here"
    }
    
    print(f"Testing validation with instruction: {test_instruction}")
    print(f"Test data: {test_data}")
    
    validation_result = llm_service._validate_extracted_fields(test_data, test_instruction)
    
    print(f"Validation result: {validation_result}")
    print()

if __name__ == "__main__":
    # Run tests
    test_llm_extraction()
    test_field_validation()
    
    print("🏁 Testing completed!") 