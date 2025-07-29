import threading
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from app.ingest.models import ProcessingInstruction
from pydantic import BaseModel
import json

class InstructionStoreService:
    """
    Singleton service for managing processing instructions in memory.
    Thread-safe storage and retrieval of processing instructions for workflows.
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._instructions: Dict[str, ProcessingInstruction] = {}
        self._data_lock = threading.RLock()
        self._initialized = True
    
    def store_instruction(
        self,
        instruction_type: str,
        target_data_source: str,
        content: str,
        expires_in_minutes: Optional[int] = None
    ) -> str:
        """
        Store a new processing instruction.
        
        Args:
            instruction_type: Type of instruction ("transformation", "validation", "routing")
            target_data_source: Target data source ("unstructured_data", "blob", etc.)
            content: Natural language instruction for LLM interpretation
            expires_in_minutes: Minutes until instruction expires
            
        Returns:
            Instruction ID
        """
        with self._data_lock:
            instruction_id = str(uuid.uuid4())
            created_at = datetime.now().isoformat()
            expires_at = None
            
            if expires_in_minutes:
                expires_at = (datetime.now() + timedelta(minutes=expires_in_minutes)).isoformat()
            
            instruction = ProcessingInstruction(
                id=instruction_id,
                instruction_type=instruction_type,
                target_data_source=target_data_source,
                content=content,
                created_at=created_at,
                expires_at=expires_at,
                status="pending"
            )
            
            self._instructions[instruction_id] = instruction
            self._cleanup_expired()
            
            return instruction_id
    
    def get_instruction(self, instruction_id: str) -> Optional[ProcessingInstruction]:
        """Get a specific instruction by ID."""
        with self._data_lock:
            self._cleanup_expired()
            return self._instructions.get(instruction_id)
    
    def get_instructions_for_target(
        self,
        target_data_source: str,
        instruction_type: Optional[str] = None,
        status: str = "pending"
    ) -> List[ProcessingInstruction]:
        """
        Get all instructions for a specific target data source.
        
        Args:
            target_data_source: Target data source to filter by
            instruction_type: Optional instruction type filter
            status: Status filter (default: "pending")
            
        Returns:
            List of matching instructions sorted by created_at (oldest first)
        """
        with self._data_lock:
            self._cleanup_expired()
            
            filtered_instructions = []
            for instruction in self._instructions.values():
                if (instruction.target_data_source == target_data_source and
                    instruction.status == status and
                    (instruction_type is None or instruction.instruction_type == instruction_type)):
                    filtered_instructions.append(instruction)
            
            # Sort by created_at (oldest first)
            return sorted(
                filtered_instructions,
                key=lambda x: x.created_at
            )
    
    def list_all_instructions(self, include_expired: bool = False) -> List[ProcessingInstruction]:
        """List all instructions, optionally including expired ones."""
        with self._data_lock:
            if not include_expired:
                self._cleanup_expired()
            
            return sorted(
                list(self._instructions.values()),
                key=lambda x: x.created_at
            )
    
    def update_instruction_status(self, instruction_id: str, status: str) -> bool:
        """
        Update the status of an instruction.
        
        Args:
            instruction_id: ID of instruction to update
            status: New status ("pending", "active", "completed", "expired")
            
        Returns:
            True if updated, False if instruction not found
        """
        with self._data_lock:
            if instruction_id in self._instructions:
                self._instructions[instruction_id].status = status
                return True
            return False
    
    def delete_instruction(self, instruction_id: str) -> bool:
        """Delete an instruction by ID."""
        with self._data_lock:
            if instruction_id in self._instructions:
                del self._instructions[instruction_id]
                return True
            return False
    
    def clear_instructions(
        self,
        target_data_source: Optional[str] = None,
        status: Optional[str] = None
    ) -> int:
        """
        Clear instructions based on filters.
        
        Args:
            target_data_source: Optional filter by target data source
            status: Optional filter by status
            
        Returns:
            Number of instructions cleared
        """
        with self._data_lock:
            to_delete = []
            
            for instruction_id, instruction in self._instructions.items():
                should_delete = True
                
                if target_data_source and instruction.target_data_source != target_data_source:
                    should_delete = False
                if status and instruction.status != status:
                    should_delete = False
                
                if should_delete:
                    to_delete.append(instruction_id)
            
            for instruction_id in to_delete:
                del self._instructions[instruction_id]
            
            return len(to_delete)
    
    def _cleanup_expired(self):
        """Remove expired instructions (internal method)."""
        current_time = datetime.now()
        to_delete = []
        
        for instruction_id, instruction in self._instructions.items():
            if instruction.expires_at:
                expires_at = datetime.fromisoformat(instruction.expires_at)
                if current_time > expires_at:
                    to_delete.append(instruction_id)
        
        for instruction_id in to_delete:
            self._instructions[instruction_id].status = "expired"
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about stored instructions."""
        with self._data_lock:
            self._cleanup_expired()
            
            stats = {
                "total_instructions": len(self._instructions),
                "by_status": {},
                "by_target": {}
            }
            
            for instruction in self._instructions.values():
                # Count by status
                status = instruction.status
                stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
                
                # Count by target
                target = instruction.target_data_source
                stats["by_target"][target] = stats["by_target"].get(target, 0) + 1
            
            return stats

# Singleton instance accessor
def get_instruction_store() -> InstructionStoreService:
    """Get the singleton instruction store instance."""
    return InstructionStoreService() 