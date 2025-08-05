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
    trigger_extract, fetch_medical_data
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
    
    if "extracted_data" in display_df.columns:
        display_df["Structured Data"] = display_df["extracted_data"].apply(format_stringified_json)
    
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

def prepare_medical_display_data(df):
    """Transform medical data for display"""
    if df.empty:
        return None

    display_df = df.copy()
    
    # Column display mapping for medical data
    display_columns = {
        "source_file_path": "Source File Path",
        "patient_name": "Patient Name",
        "patient_age": "Patient Age",
        "phone_number": "Phone Number",
        "scheduled_appointment_date": "Appointment Date",
        "dental_procedure_name": "Procedure",
        "doctor": "Doctor",
        "transform_timestamp": "Transform Timestamp"
    }
    
    # Select and rename columns
    available_columns = [col for col in display_columns.keys() if col in display_df.columns]
    display_df = display_df[available_columns]
    display_df = display_df.rename(columns=display_columns)
    
    return display_df

def show():
    try:
        # Header
        st.markdown("## Unstructured Data Connector")
        st.markdown("Process unstructured data and view results")
        
        # Process Data Section
        st.subheader("Process Unstructured Data")
        st.markdown("Use this form to process unstructured data. You can use S3 resource patterns with wildcards to limit the range of data processed (e.g., `s3://unstructured-data/memo_000*.txt`, `s3://unstructured-data/memo_001*.txt`, `s3://unstructured-data/memo_004*.txt`).")
        st.markdown("Specifying a pattern that processes a large range will take longer due to LLM remote processing.")
        
        with st.form("submit_unstructured_data"):
            
            # S3 Pattern input with validation
            source_file_path = st.text_input(
                "Data source",
                placeholder="e.g., s3://unstructured-data/memo_000*.txt",
                help="S3 path pattern with wildcards to match multiple files"
            )
            
            # Schema-specific processing instructions for Medical model
            processing_instructions = """Extract the following information from this dental appointment document and return it as JSON with these exact field names:

{
  "patient_name": "[full patient name]",
  "patient_age": "[patient age]",
  "phone_number": "[patient phone number with any extensions]",
  "scheduled_appointment_date": "[appointment date in original format]",
  "dental_procedure_name": "[specific dental procedure or treatment]",
  "doctor": "[doctor's name including title]"
}

Return only the JSON object with no additional text or formatting."""
            
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
                elif not S3PatternValidator.validate_pattern(source_file_path)[0]:
                    is_valid, error_msg, pattern_info = S3PatternValidator.validate_pattern(source_file_path)
                    st.error(f"Invalid data source: {error_msg}")
                else:
                    # Process the data directly via workflow - no database submission needed
                    with st.spinner("Processing S3 pattern directly..."):
                        try:
                            trigger_extract(
                                f"{CONSUMPTION_API_BASE}/extract-unstructured-data", 
                                "Unstructured Data",
                                source_file_pattern=source_file_path,
                                processing_instructions=processing_instructions
                            )
                            st.session_state["refresh_unstructured"] = True
                            st.rerun()
                        except Exception as e:
                            st.error(f"Failed to trigger pattern processing: {str(e)}")

        # Add visual separator between sections
        st.markdown("---")
        
        # View Data Section
        # Header with refresh button using the same styling as logs page
        if title_with_button("Structured Data Records", "Refresh Data", "refresh_data_btn", button_size="sm"):
            with st.spinner("Refreshing data..."):
                st.session_state["refresh_unstructured"] = True
            st.rerun()
        
        # Fetch and display data
        if st.session_state.get("refresh_unstructured", False):
            st.session_state["refresh_unstructured"] = False
        
        # Fetch medical data with default limit
        df = fetch_medical_data(limit=100)
        
        if not df.empty:
            # Show metrics
            total_records = len(df)
            unique_patients = df['patient_name'].nunique() if 'patient_name' in df.columns else 0
            unique_doctors = df['doctor'].nunique() if 'doctor' in df.columns else 0
            
            col1, col2, col3 = st.columns(3)
            with col1:
                ui.metric_card(
                    title="Total Records",
                    content=str(total_records),
                    key="total_medical_records"
                )
            with col2:
                ui.metric_card(
                    title="Unique Patients",
                    content=str(unique_patients),
                    key="unique_patients"
                )
            with col3:
                ui.metric_card(
                    title="Unique Doctors",
                    content=str(unique_doctors),
                    key="unique_doctors"
                )
            
            # Store the original data for JSON display
            st.session_state["medical_raw_data"] = df.to_dict('records')
            
            # Prepare and display data
            display_df = prepare_medical_display_data(df)
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
                    if selected_idx < len(st.session_state["medical_raw_data"]):
                        st.markdown("---")
                        st.subheader(f"Medical Record Details #{selected_idx + 1}")
                        
                        # Get the original record from session state
                        original_record = st.session_state["medical_raw_data"][selected_idx]
                        
                        # Display file content first
                        source_file_path = original_record.get("source_file_path")
                        if source_file_path:
                            st.markdown("#### Source Document")
                            get_file_content_display(source_file_path)
                        
                        # Display the medical record details
                        st.markdown("#### Medical Record Data")
                        # Create a clean display of medical record fields
                        medical_data = {
                            "Patient Name": original_record.get("patient_name", "N/A"),
                            "Patient Age": original_record.get("patient_age", "N/A"),
                            "Phone Number": original_record.get("phone_number", "N/A"),
                            "Appointment Date": original_record.get("scheduled_appointment_date", "N/A"),
                            "Dental Procedure": original_record.get("dental_procedure_name", "N/A"),
                            "Doctor": original_record.get("doctor", "N/A"),
                            "Transform Timestamp": original_record.get("transform_timestamp", "N/A")
                        }
                        st.json(medical_data)
                    else:
                        st.error("Selected record data not available.")
            else:
                st.info("No data available to display.")
        else:
            st.info("No medical data found. Process some unstructured data using the form above to generate medical records!")
    except Exception as e:
        st.error(f"Error loading Unstructured Data Connector: {e}")
        st.info("Please try refreshing the page.")
        return
 