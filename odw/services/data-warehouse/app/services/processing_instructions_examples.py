# Processing Instructions Examples
# 
# This file contains examples of how to use the processing instructions system
# to dynamically configure data processing workflows using natural language instructions.

from app.services.instruction_store import get_instruction_store

def example_extraction_instruction():
    """
    Example: Add an extraction instruction to extract structured data from unstructured files
    """
    instruction_store = get_instruction_store()
    
    # Add an extraction instruction with natural language
    instruction_id = instruction_store.store_instruction(
        instruction_type="extraction",
        target_data_source="unstructured_data",
        content="Extract the invoice number, invoice date, total amount, vendor name, and vendor address from this invoice document. If it's not an invoice, extract the document type, title, author, and date created.",
        expires_in_minutes=120
    )
    
    print(f"Created extraction instruction: {instruction_id}")
    return instruction_id

def example_transformation_instruction():
    """
    Example: Add a processing instruction to transform JSON data using natural language
    """
    instruction_store = get_instruction_store()
    
    # Add a transformation instruction with natural language
    instruction_id = instruction_store.store_instruction(
        instruction_type="transformation",
        target_data_source="unstructured_data",
        content="Add a processing_timestamp field with the current date and time, rename the 'content' field to 'document_content', and add a 'data_source' field with the value 'document_processor'",
        expires_in_minutes=60
    )
    
    print(f"Created transformation instruction: {instruction_id}")
    return instruction_id

def example_validation_instruction():
    """
    Example: Add a validation instruction using natural language
    """
    instruction_store = get_instruction_store()
    
    # Add a validation instruction with natural language
    instruction_id = instruction_store.store_instruction(
        instruction_type="validation",
        target_data_source="unstructured_data",
        content="Ensure that the extracted data contains the required fields: title, content, author, and date_created. If any of these fields are missing, mark the data as invalid and route it to the dead letter queue.",
        expires_in_minutes=120
    )
    
    print(f"Created validation instruction: {instruction_id}")
    return instruction_id

def example_routing_instruction():
    """
    Example: Add a routing instruction using natural language
    """
    instruction_store = get_instruction_store()
    
    # Add a routing instruction with natural language
    instruction_id = instruction_store.store_instruction(
        instruction_type="routing",
        target_data_source="unstructured_data",
        content="Based on the document_type field in the extracted data, add appropriate prefixes to the file path: 'financial/invoices/' for invoices, 'legal/contracts/' for contracts, and 'reports/' for reports. If the document_type doesn't match any of these categories, use 'misc/' as the prefix.",
        expires_in_minutes=240
    )
    
    print(f"Created routing instruction: {instruction_id}")
    return instruction_id

def example_usage_workflow():
    """
    Example: Complete workflow of creating and managing instructions
    """
    print("=== Processing Instructions Example Workflow ===")
    
    # 1. Create various types of instructions
    extraction_id = example_extraction_instruction()
    validation_id = example_validation_instruction()
    transformation_id = example_transformation_instruction()
    routing_id = example_routing_instruction()
    
    # 2. List all instructions
    instruction_store = get_instruction_store()
    all_instructions = instruction_store.list_all_instructions()
    print(f"\nTotal instructions created: {len(all_instructions)}")
    
    # 3. Get instructions for specific target
    unstructured_instructions = instruction_store.get_instructions_for_target("unstructured_data")
    print(f"Instructions for unstructured_data: {len(unstructured_instructions)}")
    
    # 4. Show instruction execution order
    print("\nInstructions will be applied in this order (by creation time):")
    for i, instruction in enumerate(unstructured_instructions, 1):
        print(f"  {i}. {instruction.instruction_type}: {instruction.content[:80]}...")
    
    # 5. Get statistics
    stats = instruction_store.get_stats()
    print(f"\nInstruction Statistics:")
    print(f"  Total: {stats['total_instructions']}")
    print(f"  By Status: {stats['by_status']}")
    print(f"  By Target: {stats['by_target']}")
    
    # 6. Update instruction status (simulate workflow processing)
    print(f"\nSimulating workflow processing...")
    instruction_store.update_instruction_status(extraction_id, "completed")
    instruction_store.update_instruction_status(validation_id, "completed")
    instruction_store.update_instruction_status(transformation_id, "active")
    
    # 7. Clear completed instructions
    cleared_count = instruction_store.clear_instructions(status="completed")
    print(f"Cleared {cleared_count} completed instructions")
    
    print("\n=== Workflow Complete ===")

if __name__ == "__main__":
    example_usage_workflow() 