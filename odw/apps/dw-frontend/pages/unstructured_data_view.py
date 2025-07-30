import streamlit as st
import time
import pandas as pd
import streamlit_shadcn_ui as ui
import json
from datetime import datetime
import requests
from urllib.parse import urlparse
import mimetypes

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

def get_file_content_display(source_file_path):
    """Fetch and display file content from S3 URL"""
    try:
        # Convert S3 URL to local server URL
        if source_file_path.startswith('s3://'):
            # Parse the S3 URL to get bucket and key
            parsed = urlparse(source_file_path)
            # For S3 URLs like s3://bucket-name/path/to/file
            # parsed.netloc will be the bucket name
            # parsed.path will be the file path
            bucket_name = parsed.netloc
            file_path = parsed.path.lstrip('/')
            # Convert to local server URL with bucket name included
            local_url = f"http://localhost:9500/{bucket_name}/{file_path}"
        else:
            local_url = source_file_path
        
        # Fetch the file content
        response = requests.get(local_url, timeout=10)
        response.raise_for_status()
        
        # Determine content type
        content_type = response.headers.get('content-type', '')
        
        # Check if it's an image
        if content_type.startswith('image/') or any(ext in source_file_path.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']):
            # Display as image with border
            st.markdown("""
            <style>
            /* Add border to images */
            .stImage img {
                border: 2px solid #e0e0e0 !important;
                border-radius: 8px !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
            }
            </style>
            """, unsafe_allow_html=True)
            st.image(local_url, caption=source_file_path, use_container_width=True)
            return True
        else:
            # Display as text
            content = response.text
            if len(content) > 10000:  # Truncate very long files
                st.text_area("File content", content[:10000] + "\n\n... (content truncated)", height=400, disabled=True, key="file_content_text", label_visibility="hidden")
                st.info(f"File content truncated. Full file has {len(content)} characters.")
            else:
                st.text_area("File content", content, height=400, disabled=True, key="file_content_text", label_visibility="hidden")
            
            # Add CSS to make text darker and larger
            st.markdown("""
            <style>
            /* Target the text area for unstructured content */
            textarea[key="file_content_text"] {
                color: #000000 !important;
                font-weight: 600 !important;
                font-size: 18px !important;
                line-height: 1.6 !important;
            }
            
            /* Fallback for general text areas */
            .stTextArea textarea {
                color: #000000 !important;
                font-weight: 600 !important;
                font-size: 18px !important;
                line-height: 1.6 !important;
            }
            </style>
            """, unsafe_allow_html=True)
            return True
            
    except requests.exceptions.RequestException as e:
        st.error(f"Failed to fetch file content: {e}")
        return False
    except Exception as e:
        st.error(f"Error displaying file content: {e}")
        return False

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
        st.markdown("Trigger and view data processing results")
        
        # Create tabs for Submit and View
        submit_tab, view_tab = st.tabs(["📤 Process Data", "📊 View Processed Data"])
    except Exception as e:
        st.error(f"Error loading Unstructured Data Connector: {e}")
        st.info("Please try refreshing the page.")
        return
    
    with submit_tab:
        st.subheader("Process Unstructured Data")
        st.markdown("Use this form to process unstructured data")
        
        # S3 Pattern Examples and Help section removed as requested
        
        with st.form("submit_unstructured_data"):
            # S3 Pattern input with validation
            source_file_path = st.text_input(
                "Data source",
                placeholder="e.g., s3://bucket/*/reports/*.txt",
                help="S3 path pattern with wildcards to match multiple files"
            )
            
            # Hard-coded processing instructions for dental appointments
            processing_instructions = "Extract the patient's name, phone number, scheduled appointment date, dental procedure name, and the doctor who will be treating the patient."
            
            # Add custom CSS to style the submit button like other pages
            st.markdown("""
            <style>
            /* Style the submit button to match other pages */
            button[data-testid="stBaseButton-secondaryFormSubmit"] {
                background-color: #000000 !important;
                color: #ffffff !important;
                border: none !important;
                border-radius: 6px !important;
                padding: 8px 12px !important;
                font-size: 12px !important;
                font-weight: 500 !important;
                height: 32px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                transition: background-color 0.2s !important;
                cursor: pointer !important;
                white-space: normal !important;
                word-wrap: break-word !important;
                min-width: fit-content !important;
            }
            button[data-testid="stBaseButton-secondaryFormSubmit"]:hover {
                background-color: #333333 !important;
            }
            </style>
            """, unsafe_allow_html=True)
            
            submitted = st.form_submit_button("Process", type="secondary")
            
            if submitted:
                # Validate inputs
                if not source_file_path:
                    st.error("Data source is required")
                else:
                    # Validate S3 pattern before submission
                    is_valid, error_msg, pattern_info = S3PatternValidator.validate_pattern(source_file_path)
                    
                    if not is_valid:
                        st.error(f"Invalid data source: {error_msg}")
                    else:
                        # Process the data
                        with st.spinner("Processing data source..."):
                            success, data_id = submit_unstructured_data(
                                source_file_path=source_file_path,
                                extracted_data_json=None,  # No longer provided by user
                                processing_instructions=processing_instructions
                            )
                        
                        if success:
                            st.success(f"Data source processed successfully! Batch ID: {data_id}")
                            
                            # Trigger async extraction for the newly submitted data
                            with st.spinner("Triggering extraction workflow for new data..."):
                                try:
                                    trigger_extract(f"{CONSUMPTION_API_BASE}/extractUnstructuredData", "Unstructured Data")
                                    st.info("🔄 Extraction workflow triggered successfully! Processing has started in the background. You can check results in the View Data tab.")
                                except Exception as e:
                                    st.warning(f"⚠️ Data processed successfully, but extraction trigger failed: {str(e)}. You can manually trigger extraction from the View Data tab.")
                            
                            st.session_state["refresh_unstructured"] = True
                        else:
                            st.error("Failed to process data source. Check the status messages below.")
    
    with view_tab:
        # Header with refresh button
        col1, col2 = st.columns([3, 1])
        with col1:
            st.subheader("Unstructured Data Records")
        with col2:
            if st.button("🔄 Refresh Data", help="Refresh the data table to show latest processed records"):
                with st.spinner("Refreshing data..."):
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
                        st.markdown("---")
                        st.subheader(f"Details for Record #{selected_idx + 1}")
                        
                        # Get the original record from session state
                        original_record = st.session_state["unstructured_raw_data"][selected_idx]
                        
                        # Display file content first
                        source_file_path = original_record.get("source_file_path")
                        if source_file_path:
                            st.markdown("#### Unstructured Content")
                            get_file_content_display(source_file_path)
                        
                        # Display the extracted data JSON
                        st.markdown("#### Extracted Structured Data")
                        if original_record.get("extracted_data_json"):
                            try:
                                extracted_data = json.loads(original_record["extracted_data_json"])
                                st.json(extracted_data)
                            except:
                                st.code(original_record["extracted_data_json"], language="json")
                        else:
                            st.info("No extracted data available for this record.")
                    else:
                        st.error("Selected record data not available.")
            else:
                st.info("No data available to display.")
        else:
            st.info("No unstructured data found. Process some data using the form above!")
    
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