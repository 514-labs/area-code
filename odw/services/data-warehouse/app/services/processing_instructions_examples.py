# Processing Instructions Examples
# 
# This file contains examples of how to use the processing instructions system
# to dynamically configure data processing workflows.

from app.services.instruction_store import get_instruction_store

def example_transformation_instruction():
    """
    Example: Add a processing instruction to transform JSON data
    """
    instruction_store = get_instruction_store()
    
    # Add a transformation instruction to add metadata to unstructured data
    instruction_id = instruction_store.store_instruction(
        instruction_type="transformation",
        target_data_source="unstructured_data",
        content={
            "json_transform": [
                {
                    "type": "add_field",
                    "field": "processing_timestamp",
                    "value": "2024-01-01T00:00:00Z"
                },
                {
                    "type": "add_field", 
                    "field": "data_source",
                    "value": "document_processor"
                },
                {
                    "type": "rename_field",
                    "old_field": "content",
                    "new_field": "document_content"
                }
            ]
        },
        priority=5,
        expires_in_minutes=60
    )
    
    print(f"Created transformation instruction: {instruction_id}")
    return instruction_id

def example_validation_instruction():
    """
    Example: Add a validation instruction to check required fields
    """
    instruction_store = get_instruction_store()
    
    # Add a validation instruction to ensure required fields are present
    instruction_id = instruction_store.store_instruction(
        instruction_type="validation",
        target_data_source="unstructured_data",
        content={
            "required_fields": ["title", "content", "author", "date_created"]
        },
        priority=10,  # High priority - validate first
        expires_in_minutes=120
    )
    
    print(f"Created validation instruction: {instruction_id}")
    return instruction_id

def example_routing_instruction():
    """
    Example: Add a routing instruction to categorize data based on content
    """
    instruction_store = get_instruction_store()
    
    # Add a routing instruction to prefix file paths based on document type
    instruction_id = instruction_store.store_instruction(
        instruction_type="routing",
        target_data_source="unstructured_data",
        content={
            "route_by_content": [
                {
                    "field": "document_type",
                    "value": "invoice",
                    "prefix": "financial/invoices/"
                },
                {
                    "field": "document_type", 
                    "value": "contract",
                    "prefix": "legal/contracts/"
                },
                {
                    "field": "document_type",
                    "value": "report",
                    "prefix": "reports/"
                }
            ]
        },
        priority=3,
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
    
    # 4. Show instruction priority order
    print("\nInstructions will be applied in this order (by priority):")
    for i, instruction in enumerate(unstructured_instructions, 1):
        print(f"  {i}. {instruction.instruction_type} (priority: {instruction.priority})")
    
    # 5. Get statistics
    stats = instruction_store.get_stats()
    print(f"\nInstruction Statistics:")
    print(f"  Total: {stats['total_instructions']}")
    print(f"  By Status: {stats['by_status']}")
    print(f"  By Type: {stats['by_type']}")
    
    # 6. Update instruction status (simulate workflow processing)
    print(f"\nSimulating workflow processing...")
    instruction_store.update_instruction_status(validation_id, "completed")
    instruction_store.update_instruction_status(transformation_id, "active")
    
    # 7. Clear completed instructions
    cleared_count = instruction_store.clear_instructions(status="completed")
    print(f"Cleared {cleared_count} completed instructions")
    
    print("\n=== Workflow Complete ===")

if __name__ == "__main__":
    example_usage_workflow() 