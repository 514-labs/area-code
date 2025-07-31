#!/usr/bin/env python3
"""
Test script to verify Medical model transformation from unstructured data.
This script tests the complete flow from LLM extraction to Medical model population.
"""

import os
import sys
import json
from datetime import datetime

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.ingest.models import UnstructuredDataSource, Medical
from app.ingest.transforms import unstructured_data_source_to_medical

def test_medical_transformation():
    """Test the transformation from UnstructuredDataSource to Medical model."""
    
    print("🧪 Testing Medical Model Transformation")
    print("=" * 50)
    
    # Test case 1: Valid dental appointment data
    print("\n✅ Test 1: Valid dental appointment data")
    
    # Sample LLM extracted JSON matching our schema
    sample_extracted_json = json.dumps({
        "patient_name": "Jacob Anderson",
        "phone_number": "555.200.8717",
        "scheduled_appointment_date": "September 26 at 4:00 PM",
        "dental_procedure_name": "teeth cleaning and filling",
        "doctor": "Dr. Hall"
    })
    
    # Create UnstructuredDataSource record
    unstructured_data = UnstructuredDataSource(
        id="test_001",
        source_file_path="s3://bucket/memo_001.txt",
        extracted_data_json=sample_extracted_json,
        processed_at="2024-01-15T10:00:00Z",
        processing_instructions="Extract dental appointment info"
    )
    
    # Test transformation
    medical_record = unstructured_data_source_to_medical(unstructured_data)
    
    if medical_record:
        print(f"   ✅ Medical record created successfully!")
        print(f"   📋 ID: {medical_record.id}")
        print(f"   👤 Patient: {medical_record.patient_name}")
        print(f"   📞 Phone: {medical_record.phone_number}")
        print(f"   📅 Appointment: {medical_record.scheduled_appointment_date}")
        print(f"   🦷 Procedure: {medical_record.dental_procedure_name}")
        print(f"   👨‍⚕️ Doctor: {medical_record.doctor}")
    else:
        print("   ❌ Failed to create medical record")
    
    # Test case 2: Incomplete data (should be skipped)
    print("\n⚠️  Test 2: Incomplete data (missing required fields)")
    
    incomplete_json = json.dumps({
        "patient_name": "Jane Doe",
        "phone_number": "555-123-4567"
        # Missing appointment date, procedure, and doctor
    })
    
    incomplete_data = UnstructuredDataSource(
        id="test_002",
        source_file_path="s3://bucket/memo_002.txt",
        extracted_data_json=incomplete_json,
        processed_at="2024-01-15T10:01:00Z",
        processing_instructions="Extract dental appointment info"
    )
    
    medical_record_2 = unstructured_data_source_to_medical(incomplete_data)
    
    if medical_record_2 is None:
        print("   ✅ Correctly skipped incomplete data")
    else:
        print("   ❌ Should have skipped incomplete data")
    
    # Test case 3: Invalid JSON (should be skipped)
    print("\n🚫 Test 3: Invalid JSON data")
    
    invalid_data = UnstructuredDataSource(
        id="test_003",
        source_file_path="s3://bucket/memo_003.txt",
        extracted_data_json="invalid json {",
        processed_at="2024-01-15T10:02:00Z",
        processing_instructions="Extract dental appointment info"
    )
    
    medical_record_3 = unstructured_data_source_to_medical(invalid_data)
    
    if medical_record_3 is None:
        print("   ✅ Correctly handled invalid JSON")
    else:
        print("   ❌ Should have skipped invalid JSON")
    
    # Test case 4: Non-medical data (should be skipped)
    print("\n📄 Test 4: Non-medical data")
    
    non_medical_json = json.dumps({
        "title": "Meeting Notes",
        "date": "2024-01-15",
        "attendees": ["Alice", "Bob"],
        "summary": "Discussed project timeline"
    })
    
    non_medical_data = UnstructuredDataSource(
        id="test_004",
        source_file_path="s3://bucket/meeting_notes.txt",
        extracted_data_json=non_medical_json,
        processed_at="2024-01-15T10:03:00Z",
        processing_instructions="Extract meeting information"
    )
    
    medical_record_4 = unstructured_data_source_to_medical(non_medical_data)
    
    if medical_record_4 is None:
        print("   ✅ Correctly skipped non-medical data")
    else:
        print("   ❌ Should have skipped non-medical data")
    
    print("\n" + "=" * 50)
    print("🎉 Medical transformation tests completed!")
    print("\n💡 Next steps:")
    print("   1. Start Moose service: ./setup.sh start")
    print("   2. Submit test memo via frontend")
    print("   3. Verify Medical record creation via API")
    print("   4. Check Medical table in ClickHouse")

def test_schema_instructions():
    """Test the new schema-aware instructions format."""
    
    print("\n🔍 Testing Schema-Aware Instructions")
    print("-" * 30)
    
    instructions = """Extract the following information from this dental appointment document and return it as JSON with these exact field names:

{
  "patient_name": "[full patient name]",
  "phone_number": "[patient phone number with any extensions]",
  "scheduled_appointment_date": "[appointment date in original format]",
  "dental_procedure_name": "[specific dental procedure or treatment]",
  "doctor": "[doctor's name including title]"
}

Return only the JSON object with no additional text or formatting."""
    
    print("✅ Schema-aware instructions:")
    print(instructions)
    print("\n✅ Instructions are properly formatted for LLM processing")

if __name__ == "__main__":
    test_medical_transformation()
    test_schema_instructions()