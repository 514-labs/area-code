import streamlit as st
import time
import pandas as pd
import streamlit_shadcn_ui as ui
import json
from datetime import datetime

# Import shared functions
from utils.api_functions import (
    fetch_unstructured_data, submit_unstructured_data, trigger_extract
)
from utils.constants import CONSUMPTION_API_BASE
from utils.tooltip_utils import info_icon_with_tooltip, title_with_info_icon, title_with_button
from utils.s3_pattern_validator import S3PatternValidator

def format_processing_instructions(instructions):
    """Format processing instructions for display"""
    if instructions is None or instructions == "":
        return "None"
    return instructions[:50] + "..." if len(instructions) > 50 else instructions

def format_extracted_data(data_json):
    """Format extracted data JSON for display"""
    if data_json is None:
        return "Not processed yet"
    try:
        data = json.loads(data_json)
        if isinstance(data, dict):
            # Show a summary of the data
            keys = list(data.keys())
            if len(keys) <= 3:
                return ", ".join(keys)
            else:
                return f"{', '.join(keys[:3])}... ({len(keys)} keys)"
        else:
            return str(data)[:50] + "..." if len(str(data)) > 50 else str(data)
    except:
        return "Invalid JSON"

def format_stringified_json(data_json):
    """Format the full stringified JSON for display"""
    if data_json is None:
        return "Not processed yet"
    try:
        # Parse and re-stringify to ensure proper formatting
        data = json.loads(data_json)
        return json.dumps(data, indent=2)
    except:
        return "Invalid JSON"

def prepare_unstructured_display_data(df):
    """Transform unstructured data for display"""
    if df.empty:
        return None

    display_df = df.copy()
    
    # Format columns for better display
    if "processing_instructions" in display_df.columns:
        display_df["Processing Instructions"] = display_df["processing_instructions"].apply(format_processing_instructions)
    
    if "extracted_data_json" in display_df.columns:
        display_df["Structured Data"] = display_df["extracted_data_json"].apply(format_stringified_json)
    
    # Column display mapping
    display_columns = {
        "id": "ID",
        "source_file_path": "Source File Path",
        "Structured Data": "Structured Data",
        "processed_at": "Processed At",
        "transform_timestamp": "Transform Timestamp",
        "Processing Instructions": "Processing Instructions"
    }
    
    # Select and rename columns
    available_columns = [col for col in display_columns.keys() if col in display_df.columns]
    display_df = display_df[available_columns]
    display_df = display_df.rename(columns=display_columns)
    
    return display_df

def show():
    try:
        # Header
        st.title("Unstructured Data Connector")
        st.markdown("Submit and view unstructured data processing results")
        
        # Create tabs for Submit and View
        submit_tab, view_tab = st.tabs(["📤 Submit Data", "📊 View Data"])
    except Exception as e:
        st.error(f"Error loading Unstructured Data Connector: {e}")
        st.info("Please try refreshing the page.")
        return
    
    with submit_tab:
        st.subheader("Submit Unstructured Data")
        st.markdown("Use this form to submit unstructured data for processing")
        
        # S3 Pattern Examples and Help section removed as requested
        
        with st.form("submit_unstructured_data"):
            # S3 Pattern input with validation
            source_file_path = st.text_input(
                "S3 Pattern",
                placeholder="e.g., s3://bucket/*/reports/*.txt",
                help="S3 path pattern with wildcards to match multiple files"
            )
            
            # Real-time validation feedback
            if source_file_path:
                is_valid, error_msg, pattern_info = S3PatternValidator.validate_pattern(source_file_path)
                
                if is_valid and pattern_info:
                    # Show validation success with pattern info
                    complexity = pattern_info.get('estimated_complexity', 'unknown')
                    wildcard_count = pattern_info.get('wildcard_count', 0)
                    has_wildcards = pattern_info.get('has_wildcards', False)
                    
                    if has_wildcards:
                        complexity_emoji = {
                            "simple": "🟢",
                            "low": "🟡",
                            "medium": "🟠", 
                            "high": "🔴"
                        }
                        st.success(f"✅ Valid S3 pattern {complexity_emoji.get(complexity, '⚪')} Complexity: {complexity.title()} ({wildcard_count} wildcards)")
                        
                        # Show suggestions if any
                        suggestions = S3PatternValidator.suggest_improvements(source_file_path)
                        if suggestions:
                            st.info("💡 **Suggestions:** " + " • ".join(suggestions))
                    else:
                        st.info("ℹ️ This appears to be a single file path (no wildcards)")
                
                elif error_msg:
                    st.error(f"❌ {error_msg}")
            
            processing_instructions = st.text_area(
                "Processing Instructions",
                placeholder="Instructions for how to process this data...",
                help="Instructions for processing the data using LLM",
                height=100
            )
            
            submitted = st.form_submit_button("Submit Data", type="primary")
            
            if submitted:
                # Validate inputs
                if not source_file_path:
                    st.error("S3 pattern is required")
                elif not processing_instructions:
                    st.error("Processing instructions are required")
                else:
                    # Validate S3 pattern before submission
                    is_valid, error_msg, pattern_info = S3PatternValidator.validate_pattern(source_file_path)
                    
                    if not is_valid:
                        st.error(f"Invalid S3 pattern: {error_msg}")
                    else:
                        # Show processing info
                        if pattern_info and pattern_info.get('has_wildcards'):
                            complexity = pattern_info.get('estimated_complexity', 'unknown')
                            if complexity == 'high':
                                st.warning("⚠️ High complexity pattern detected. This may take longer to process.")
                        
                        # Submit the data
                        with st.spinner("Submitting S3 pattern for processing..."):
                            success, data_id = submit_unstructured_data(
                                source_file_path=source_file_path,
                                extracted_data_json=None,  # No longer provided by user
                                processing_instructions=processing_instructions
                            )
                        
                        if success:
                            st.success(f"S3 pattern submitted successfully! Batch ID: {data_id}")
                            st.session_state["refresh_unstructured"] = True
                        else:
                            st.error("Failed to submit S3 pattern. Check the status messages below.")
    
    with view_tab:
        # Header with extract button
        col1, col2 = st.columns([3, 1])
        with col1:
            st.subheader("Unstructured Data Records")
        with col2:
            if st.button("🔄 Extract Data", help="Trigger extraction workflow"):
                with st.spinner("Triggering extraction..."):
                    trigger_extract(f"{CONSUMPTION_API_BASE}/extractUnstructuredData", "Unstructured Data")
                    time.sleep(2)
                st.session_state["refresh_unstructured"] = True
                st.rerun()
        
        # Removed filter options as requested
        
        # Fetch and display data
        if st.session_state.get("refresh_unstructured", False):
            st.session_state["refresh_unstructured"] = False
        
        # Fetch data with default limit
        df = fetch_unstructured_data(limit=100)
        
        if not df.empty:
            # Show metrics
            total_records = len(df)
            unique_sources = df['source_file_path'].nunique() if 'source_file_path' in df.columns else 0
            
            col1, col2, col3 = st.columns(3)
            with col1:
                ui.metric_card(
                    title="Total Records",
                    content=str(total_records),
                    key="total_unstructured_records"
                )
            with col2:
                ui.metric_card(
                    title="Unique Sources",
                    content=str(unique_sources),
                    key="unique_sources"
                )
            with col3:
                has_processing_instructions = df['processing_instructions'].notna().sum() if 'processing_instructions' in df.columns else 0
                ui.metric_card(
                    title="With Instructions",
                    content=str(has_processing_instructions),
                    key="with_instructions"
                )
            
            # Store the original data for JSON display
            st.session_state["unstructured_raw_data"] = df.to_dict('records')
            
            # Prepare and display data
            display_df = prepare_unstructured_display_data(df)
            if display_df is not None:
                # Add selection capability to the dataframe
                selected_rows = st.dataframe(
                    display_df,
                    use_container_width=True,
                    hide_index=True,
                    on_select="rerun",
                    selection_mode="single-row"
                )
                
                # Display JSON for selected row
                if selected_rows.selection.rows:
                    selected_idx = selected_rows.selection.rows[0]
                    if selected_idx < len(st.session_state["unstructured_raw_data"]):
                        st.subheader(f"JSON Details for Record #{selected_idx + 1}")
                        
                        # Get the original record from session state
                        original_record = st.session_state["unstructured_raw_data"][selected_idx]
                        
                        # Display the extracted data JSON
                        if original_record.get("extracted_data_json"):
                            st.markdown("**Extracted Structured Data:**")
                            try:
                                extracted_data = json.loads(original_record["extracted_data_json"])
                                st.json(extracted_data)
                            except:
                                st.code(original_record["extracted_data_json"], language="json")
                        else:
                            st.info("No extracted data available for this record.")
                        
                        # Display the full record JSON
                        st.markdown("**Full Record JSON:**")
                        st.json(original_record)
                    else:
                        st.error("Selected record data not available.")
            else:
                st.info("No data available to display.")
        else:
            st.info("No unstructured data found. Submit some data using the form above!")
    
    # Status messages
    if "submit_status_msg" in st.session_state:
        if st.session_state.get("submit_status_type") == "success":
            st.success(st.session_state["submit_status_msg"])
        else:
            st.error(st.session_state["submit_status_msg"])
        
        # Clear status after showing
        if time.time() - st.session_state.get("submit_status_time", 0) > 5:
            del st.session_state["submit_status_msg"]
            del st.session_state["submit_status_type"]
            del st.session_state["submit_status_time"] 