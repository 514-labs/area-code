#!/usr/bin/env python3
"""
Test script to verify image extraction using LLM vision capabilities.
This script tests that the LLM service can process images and extract structured data.
"""

import os
import sys
import json
import base64
from datetime import datetime

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.utils.llm_service import LLMService
# Note: FileReader has been moved to connectors project
# This test now uses direct S3FileReader for simplicity

def create_test_image():
    """Create a simple test image with text for testing."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        # Create a simple image with text
        img = Image.new('RGB', (400, 200), color='white')
        draw = ImageDraw.Draw(img)
        
        # Add some text to the image
        text = "Patient: John Smith\nPhone: 555-123-4567\nAppointment: 2025-01-15"
        draw.text((20, 20), text, fill='black')
        
        # Save the test image
        test_image_path = "test_image.png"
        img.save(test_image_path)
        
        print(f"✅ Created test image: {test_image_path}")
        return test_image_path
        
    except ImportError:
        print("⚠️  PIL not available, skipping image creation test")
        return None
    except Exception as e:
        print(f"❌ Failed to create test image: {str(e)}")
        return None

def test_image_extraction():
    """Test image extraction with LLM vision capabilities."""
    
    print("🧪 Testing Image Extraction with LLM Vision")
    print("=" * 50)
    
    # Initialize LLM service
    llm_service = LLMService()
    
    if not llm_service.enabled:
        print("❌ LLM service is disabled. Set ANTHROPIC_API_KEY to run tests.")
        return
    
    print(f"✅ LLM service initialized with model: {llm_service.model}")
    print(f"✅ Strict field validation: {llm_service.strict_field_validation}")
    print()
    
    # Create a test image
    test_image_path = create_test_image()
    if not test_image_path:
        print("⚠️  Skipping image extraction test due to missing test image")
        return
    
    try:
        # Test cases for image extraction
        test_cases = [
            {
                "name": "Patient Information from Image",
                "instruction": "Extract patient name and phone number from the image",
                "expected_fields": ["patient_name", "phone_number"]
            },
            {
                "name": "Appointment Details from Image",
                "instruction": "Extract appointment date from the image",
                "expected_fields": ["appointment_date"]
            },
            {
                "name": "Complete Patient Record from Image",
                "instruction": "Extract all patient information including name, phone, and appointment date",
                "expected_fields": ["patient_name", "phone_number", "appointment_date"]
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"📋 Test {i}: {test_case['name']}")
            print(f"   Instruction: {test_case['instruction']}")
            print(f"   Expected fields: {test_case['expected_fields']}")
            
            try:
                # TODO: Update this test to use the new S3 connector pattern
                # FileReader has been moved to connectors project
                print("   ⚠️  Test skipped - FileReader moved to connectors project")
                continue
                
                print(f"   📄 File type: {file_type}")
                print(f"   📄 Content preview: {file_content[:100]}...")
                
                # Perform extraction
                start_time = datetime.now()
                extracted_data = llm_service.extract_structured_data(
                    file_content=file_content,
                    file_type=file_type,
                    instruction=test_case['instruction'],
                    file_path=test_image_path
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
        
        # Clean up test image
        if os.path.exists(test_image_path):
            os.remove(test_image_path)
            print(f"🧹 Cleaned up test image: {test_image_path}")
        
    except Exception as e:
        print(f"❌ Image extraction test failed: {str(e)}")

def test_image_detection():
    """Test that the system correctly detects image content."""
    
    print("🔍 Testing Image Content Detection")
    print("=" * 35)
    
    llm_service = LLMService()
    
    # Test image content detection
    test_cases = [
        {
            "content": "[IMAGE_DATA]data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "expected": True,
            "description": "Base64 encoded PNG image"
        },
        {
            "content": "This is just regular text content",
            "expected": False,
            "description": "Regular text content"
        },
        {
            "content": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
            "expected": True,
            "description": "Base64 encoded JPEG image"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"📋 Test {i}: {test_case['description']}")
        
        is_image = llm_service._is_image_content(test_case['content'])
        expected = test_case['expected']
        
        if is_image == expected:
            print(f"   ✅ Correctly detected as {'image' if expected else 'text'}")
        else:
            print(f"   ❌ Incorrectly detected as {'image' if is_image else 'text'} (expected {'image' if expected else 'text'})")
        
        print()

if __name__ == "__main__":
    # Run tests
    test_image_detection()
    test_image_extraction()
    
    print("🏁 Image extraction testing completed!") 