import streamlit as st
import time
import requests
import pandas as pd
import random
import json
import streamlit_shadcn_ui as ui
from datetime import datetime, timedelta
from requests.exceptions import ConnectionError

from .constants import CONSUMPTION_API_BASE, WORKFLOW_API_BASE, INGEST_API_BASE

def normalize_for_display(blob_df, log_df, events_df=None):
    """Convert blob, log, and events data to a unified display format for 'All' view"""
    combined_rows = []

    # Process blob data
    if not blob_df.empty:
        for _, row in blob_df.iterrows():
            combined_rows.append({
                "ID": row["id"],
                "Type": "Blob",
                "Title": row["file_name"],
                "Details": f"{row['bucket_name']}{row['file_path']}{row['file_name']}",
                "Info": f"{row['file_size']:,} bytes",
                "Metadata": f"Permissions: {', '.join(row['permissions'])}",
                "timestamp": row["transform_timestamp"] if "transform_timestamp" in row else row.get("ingested_at", "")
            })

    # Process log data
    if not log_df.empty:
        for _, row in log_df.iterrows():
            combined_rows.append({
                "ID": row["id"],
                "Type": "Log",
                "Title": row["level"],
                "Details": row["message"][:100] + "..." if len(row["message"]) > 100 else row["message"],
                "Info": row.get("source", "Unknown"),
                "Metadata": f"Trace: {row.get('trace_id', 'N/A')}",
                "timestamp": row["transform_timestamp"] if "transform_timestamp" in row else row.get("timestamp", "")
            })

    # Process events data
    if events_df is not None and not events_df.empty:
        for _, row in events_df.iterrows():
            combined_rows.append({
                "ID": row.get("id", "N/A"),
                "Type": "Event",
                "Title": row.get("event_name", "Unknown"),
                "Details": f"User: {row.get('distinct_id', 'N/A')} | Session: {row.get('session_id', 'N/A')}",
                "Info": row.get("project_id", "Unknown"),
                "Metadata": f"IP: {row.get('ip_address', 'N/A')}",
                "timestamp": row["transform_timestamp"] if "transform_timestamp" in row else row.get("timestamp", "")
            })

    # Create unified DataFrame
    if combined_rows:
        df = pd.DataFrame(combined_rows)
        df = df[["ID", "Type", "Title", "Details", "Info", "Metadata"]]
        return df
    else:
        return pd.DataFrame()

def fetch_blob_data(tag="All", should_throw=False):
    """Fetch blob data from the getBlobs API"""
    api_url = f"{CONSUMPTION_API_BASE}/getBlobs"
    if tag and tag != "All":
        api_url += f"?tag={tag}"

    try:
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])
        df = pd.DataFrame(items)
        return df
    except Exception as e:
        if should_throw:
            raise e
        else:
            print(f"Blob API error: {e}")
            st.toast("Error fetching blobs. Check terminal for details.")
        return pd.DataFrame()

def fetch_log_data(tag="All", should_throw=False):
    """Fetch log data from the getLogs API"""
    api_url = f"{CONSUMPTION_API_BASE}/getLogs"
    if tag and tag != "All":
        api_url += f"?tag={tag}"

    try:
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])
        df = pd.DataFrame(items)
        return df
    except Exception as e:
        if should_throw:
            raise e
        else:
            print(f"Log API error: {e}")
            st.toast("Error fetching logs. Check terminal for details.")
        return pd.DataFrame()

def fetch_events_for_analytics(limit=1000, should_throw=False):
    """Fetch events data specifically for analytics purposes"""
    return fetch_events_data(limit=limit, should_throw=should_throw)

def fetch_data(tag):
    """Fetch combined data based on tag filter - backward compatibility function"""
    if tag == "Blob":
        return fetch_blob_data(tag)
    elif tag == "Logs":
        return fetch_log_data(tag)
    elif tag == "Events":
        return fetch_events_for_analytics()
    else:
        # Get all three types of data and create unified view
        try:
            blob_df = fetch_blob_data(tag, should_throw=True)
            log_df = fetch_log_data(tag, should_throw=True)
            events_df = fetch_events_for_analytics(should_throw=True)
            return normalize_for_display(blob_df, log_df, events_df)
        except Exception as e:
            if is_data_warehouse_not_ready(e):
                st.toast("Services may still be starting up. Try refreshing in a moment.")
            else:
                print(f"Error fetching data: {e}")
                st.toast("Error fetching data. Check terminal for details.")
            return pd.DataFrame()

def trigger_extract(api_url, label, source_file_pattern=None, processing_instructions=None):
    batch_size = random.randint(10, 100)
    
    # Build URL with parameters
    url = f"{api_url}?batch_size={batch_size}"
    
    # Add unstructured data specific parameters if provided
    if source_file_pattern:
        url += f"&source_file_pattern={source_file_pattern}"
    if processing_instructions:
        # URL encode the processing instructions to handle special characters
        from urllib.parse import quote
        url += f"&processing_instructions={quote(processing_instructions)}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        # Create appropriate success message
        if source_file_pattern:
            pattern_msg = f" for pattern {source_file_pattern}"
            st.session_state["extract_status_msg"] = f"{label} extract triggered{pattern_msg}."
        else:
            st.session_state["extract_status_msg"] = f"{label} extract triggered with batch size {batch_size}."
        
        st.session_state["extract_status_type"] = "success"
        st.session_state["extract_status_time"] = time.time()
    except Exception as e:
        if source_file_pattern:
            st.session_state["extract_status_msg"] = f"Failed to trigger {label} extract: {e}"
        else:
            st.session_state["extract_status_msg"] = f"Failed to trigger {label} extract (batch size {batch_size}): {e}"
        st.session_state["extract_status_type"] = "error"
        st.session_state["extract_status_time"] = time.time()

def trigger_all_extracts():
    trigger_extract(f"{CONSUMPTION_API_BASE}/extract-blob", "Blob")
    trigger_extract(f"{CONSUMPTION_API_BASE}/extract-logs", "Logs")
    trigger_extract(f"{CONSUMPTION_API_BASE}/extract-events", "Events")

def fetch_events_data(event_name=None, project_id=None, distinct_id=None, limit=100, should_throw=False):
    """Fetch events data with filtering options"""
    params = {"limit": limit}
    if event_name:
        params["event_name"] = event_name  
    if project_id:
        params["project_id"] = project_id
    if distinct_id:
        params["distinct_id"] = distinct_id
        
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    api_url = f"{CONSUMPTION_API_BASE}/getEvents?{query_string}"
    
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        return pd.DataFrame(data.get("items", []))
    except Exception as e:
        if should_throw:
            raise e
        else:
            print(f"Events API error: {e}")
            st.toast("Error fetching events. Check terminal for details.")
        return pd.DataFrame()

def fetch_event_analytics(hours=24):
    """Fetch event analytics for dashboard by calculating from actual events data"""
    try:
        # Fetch recent events data for analytics calculation
        df = fetch_events_data(limit=10000)  # Get more data for better analytics
        
        if df.empty:
            # Return empty structure if no data
            return {
                "event_counts": [
                    {"event_name": "pageview", "count": 0},
                    {"event_name": "signup", "count": 0},
                    {"event_name": "click", "count": 0},
                    {"event_name": "purchase", "count": 0},
                    {"event_name": "other", "count": 0}
                ],
                "user_metrics": {
                    "unique_users": 0,
                    "unique_sessions": 0,
                    "total_events": 0
                }
            }
        
        # Calculate event counts by event_name
        event_counts_dict = df['event_name'].value_counts().to_dict()
        
        # Create event_counts array in expected format
        known_events = ["pageview", "signup", "click", "purchase"]
        event_counts = []
        
        # Count known events
        total_known_events = 0
        for event_name in known_events:
            count = event_counts_dict.get(event_name, 0)
            total_known_events += count
            event_counts.append({"event_name": event_name, "count": count})
        
        # Calculate "other" events (any events not in the known_events list)
        total_events = len(df)
        other_count = total_events - total_known_events
        event_counts.append({"event_name": "other", "count": other_count})
        
        # Calculate user metrics
        unique_users = df['distinct_id'].nunique() if 'distinct_id' in df.columns else 0
        unique_sessions = df['session_id'].nunique() if 'session_id' in df.columns else 0
        
        return {
            "event_counts": event_counts,
            "user_metrics": {
                "unique_users": unique_users,
                "unique_sessions": unique_sessions,
                "total_events": total_events
            }
        }
        
    except Exception as e:
        st.error(f"Failed to calculate event analytics: {e}")
        # Return empty structure on error
        return {
            "event_counts": [
                {"event_name": "pageview", "count": 0},
                {"event_name": "signup", "count": 0},
                {"event_name": "click", "count": 0},
                {"event_name": "purchase", "count": 0},
                {"event_name": "other", "count": 0}
            ],
            "user_metrics": {
                "unique_users": 0,
                "unique_sessions": 0,
                "total_events": 0
            }
        }



def handle_refresh_and_fetch(refresh_key, tag, trigger_func=None, trigger_label=None, button_label=None):
    if refresh_key not in st.session_state:
        st.session_state[refresh_key] = False
    if button_label and st.button(button_label):
        if trigger_func:
            trigger_func()
            time.sleep(2.5)
        st.session_state[refresh_key] = True
    if st.session_state.get(refresh_key, False):
        df = fetch_data(tag)
        st.session_state[refresh_key] = False
    else:
        df = fetch_data(tag)
    return df

def get_dlq_topic_name(endpoint_path):
    """Get the appropriate DLQ topic name based on endpoint"""
    if "blob" in endpoint_path.lower():
        return "BlobSourceDeadLetterQueue"
    elif "logs" in endpoint_path.lower():
        return "LogSourceDeadLetterQueue"
    elif "events" in endpoint_path.lower():
        return "EventSourceDeadLetterQueue"
    else:
        # Fallback to old name for backward compatibility
        return "FooDeadLetterQueue"

def render_dlq_controls(endpoint_path, refresh_key, show_info_icon=False, info_tooltip=""):
    """
    Renders DLQ testing controls with batch size and failure percentage inputs.
    
    Args:
        endpoint_path (str): The API endpoint path (e.g., "extract-blob", "extract-logs")
        refresh_key (str): The session state key for refreshing data after DLQ trigger
        show_info_icon (bool): Whether to show an info icon next to the title
        info_tooltip (str): Tooltip text for the info icon
    """
    # DLQ section positioned below the table and to the left
    st.divider()
    
    if show_info_icon:
        from utils.tooltip_utils import title_with_info_icon
        title_with_info_icon("Dead Letter Queue Testing", info_tooltip, f"dlq_info_{endpoint_path}")
    else:
        st.markdown("#### Dead Letter Queue Testing")
    
    # Create columns to keep DLQ controls on the left side
    dlq_col, _ = st.columns([1, 2])
    
    # Store the filtered messages in session state so we can display them outside the column
    dlq_messages_key = f"dlq_messages_{endpoint_path}"
    
    with dlq_col:
        # Input fields for batch size and failure percentage
        batch_size = st.number_input(
            "Batch size", 
            min_value=1, 
            value=10, 
            step=1,
            key=f"dlq_batch_size_{endpoint_path}"
        )
        
        failure_percentage = st.number_input(
            "Failure percentage", 
            min_value=0, 
            max_value=100, 
            value=20, 
            step=1,
            key=f"dlq_failure_percentage_{endpoint_path}"
        )
        
        # Create columns for buttons
        btn_col1, btn_col2 = st.columns(2)
        
        with btn_col1:
            if ui.button(text="Trigger DLQ", key=f"trigger_dlq_btn_{endpoint_path}"):
                # Validate inputs
                if batch_size < 1 or batch_size > 10000:
                    st.error("Batch size must be between 1 and 10000")
                elif failure_percentage < 0 or failure_percentage > 100:
                    st.error("Failure percentage must be between 0 and 100")
                else:
                    # Make the DLQ request
                    dlq_url = f"{CONSUMPTION_API_BASE}/{endpoint_path}?batch_size={batch_size}&fail_percentage={failure_percentage}"
                    try:
                        with st.spinner(f"Triggering DLQ with batch size {batch_size} and {failure_percentage}% failure rate..."):
                            response = requests.get(dlq_url)
                            response.raise_for_status()
                            st.session_state["extract_status_msg"] = f"DLQ triggered successfully with batch size {batch_size} and {failure_percentage}% failure rate."
                            st.session_state["extract_status_type"] = "success"
                            st.session_state["extract_status_time"] = time.time()
                            time.sleep(2)  # Wait for initial processing
                        
                        # Fetch DLQ messages immediately after successful trigger
                        with st.spinner("Fetching DLQ messages..."):
                            time.sleep(3)
                            # Use the appropriate DLQ topic name
                            dlq_topic = get_dlq_topic_name(endpoint_path)
                            dlq_messages_url = f"http://localhost:9999/topic/{dlq_topic}/messages?partition=0&offset=0&count=100&isAnyProto=false"
                            
                            try:
                                # Add JSON headers to request JSON response
                                headers = {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json'
                                }
                                dlq_response = requests.get(dlq_messages_url, headers=headers)
                                dlq_response.raise_for_status()                            
                                dlq_data = dlq_response.json()

                                # Determine filter tag based on endpoint
                                if "blob" in endpoint_path.lower():
                                    filter_tag = "Blob"
                                elif "logs" in endpoint_path.lower():
                                    filter_tag = "Logs"
                                elif "events" in endpoint_path.lower():
                                    filter_tag = "Events"
                                else:
                                    filter_tag = None

                                # Track the highest offset we've seen to avoid duplicates
                                highest_offset_key = f"dlq_highest_offset_{endpoint_path}"
                                current_highest_offset = st.session_state.get(highest_offset_key, -1)
                                new_highest_offset = current_highest_offset
                                
                                # Parse and filter messages
                                filtered_messages = []

                                for i, item in enumerate(dlq_data):
                                    if "message" in item and item["message"]:
                                        # Only process messages with offset higher than our current highest
                                        item_offset = item.get('offset', 0)
                                        if item_offset <= current_highest_offset:
                                            continue

                                        # Track the new highest offset
                                        new_highest_offset = max(new_highest_offset, item_offset)

                                        try:
                                            # Parse the stringified JSON message
                                            parsed_message = json.loads(item["message"])
                                            
                                            # For new structured data, filter based on model type
                                            original_record = parsed_message.get("original_record", {})

                                            # Check if this is the type we want to filter for
                                            is_blob = "bucket_name" in original_record
                                            is_log = "level" in original_record
                                            is_event = "event_name" in original_record

                                            if filter_tag == "Blob" and not is_blob:
                                                continue
                                            elif filter_tag == "Logs" and not is_log:
                                                continue
                                            elif filter_tag == "Events" and not is_event:
                                                continue
                                            
                                            filtered_messages.append((i, item, parsed_message))

                                        except json.JSONDecodeError as e:
                                            st.error(f"Failed to parse message {i+1}: {e}")
                                            st.text(f"Raw message: {item['message']}")

                                # Store filtered messages for display outside column
                                if filtered_messages:
                                    # Create DataFrame from filtered messages
                                    table_data = []
                                    raw_json_data = []

                                    for display_idx, (original_idx, item, parsed_message) in enumerate(filtered_messages):
                                        # Extract key information for table
                                        original_record = parsed_message.get("original_record", {})
                                        
                                        # Different display based on type
                                        if "bucket_name" in original_record:  # Blob
                                            row = {
                                                "Partition": item.get('partition', 'N/A'),
                                                "Offset": item.get('offset', 'N/A'),
                                                "Error Message": parsed_message.get("error_message", "Unknown error"),
                                                "Failed At": parsed_message.get("failed_at", "Unknown"),
                                                "Record ID": original_record.get("id", "Unknown"),
                                                "File Name": original_record.get("file_name", "Unknown"),
                                                "Bucket": original_record.get("bucket_name", "Unknown"),
                                                "File Size": original_record.get("file_size", "Unknown")
                                            }
                                        elif "level" in original_record: # Log
                                            row = {
                                                "Partition": item.get('partition', 'N/A'),
                                                "Offset": item.get('offset', 'N/A'),
                                                "Error Message": parsed_message.get("error_message", "Unknown error"),
                                                "Failed At": parsed_message.get("failed_at", "Unknown"),
                                                "Record ID": original_record.get("id", "Unknown"),
                                                "Level": original_record.get("level", "Unknown"),
                                                "Source": original_record.get("source", "Unknown"),
                                                "Message": (original_record.get("message", "Unknown")[:50] + "...") if len(original_record.get("message", "")) > 50 else original_record.get("message", "Unknown")
                                            }
                                        elif "event_name" in original_record: # Event
                                            row = {
                                                "Partition": item.get('partition', 'N/A'),
                                                "Offset": item.get('offset', 'N/A'),
                                                "Error Message": parsed_message.get("error_message", "Unknown error"),
                                                "Failed At": parsed_message.get("failed_at", "Unknown"),
                                                "Record ID": original_record.get("id", "Unknown"),
                                                "Event Name": original_record.get("event_name", "Unknown"),
                                                "Project ID": original_record.get("project_id", "Unknown"),
                                                "Distinct ID": original_record.get("distinct_id", "Unknown")
                                            }

                                        table_data.append(row)
                                        raw_json_data.append(parsed_message)

                                    # Store in session state for display outside the column
                                    st.session_state[dlq_messages_key] = table_data
                                    st.session_state[f"dlq_raw_messages_{endpoint_path}"] = raw_json_data

                                    # Update the highest offset tracking
                                    st.session_state[highest_offset_key] = new_highest_offset
                                else:
                                    # No new messages matching the filter
                                    if filter_tag:
                                        st.info(f"No new DLQ messages found matching {filter_tag} filter.")
                                    else:
                                        st.info("No new DLQ messages found.")
                                    
                                    # Clear any existing messages for this endpoint
                                    if dlq_messages_key in st.session_state:
                                        del st.session_state[dlq_messages_key]

                            except json.JSONDecodeError as e:
                                st.error(f"Failed to parse DLQ response as JSON: {e}")
                                st.text(f"Response status: {dlq_response.status_code}")
                                st.text(f"Response headers: {dict(dlq_response.headers)}")
                                st.text(f"Response content: {dlq_response.text}")
                        
                        # Refresh the main items table after all DLQ processing is complete
                        st.session_state[refresh_key] = True
                        st.rerun()
                    except Exception as e:
                        st.session_state["extract_status_msg"] = f"Failed to trigger DLQ: {e}"
                        st.session_state["extract_status_type"] = "error"
                        st.session_state["extract_status_time"] = time.time()
        
        with btn_col2:
            # Use custom HTML button with specific styling for View Queues
            st.markdown("""
            <style>
            .view-queues-btn {
                display: inline-block;
                padding: 0.5rem 1rem;
                background-color: #F5F5F5;
                color: #000000 !important;
                border: 1px solid #000000;
                border-radius: 0.375rem;
                text-decoration: none !important;
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .view-queues-btn:hover {
                background-color: #F5F5F5;
                color: #000000 !important;
                border-color: #000000;
                text-decoration: none !important;
            }
            .view-queues-btn:visited {
                color: #000000 !important;
                text-decoration: none !important;
            }
            .view-queues-btn:active {
                color: #000000 !important;
                text-decoration: none !important;
            }
            .view-queues-btn:link {
                color: #000000 !important;
                text-decoration: none !important;
            }
            </style>
            <a href="http://localhost:9999" target="_blank" class="view-queues-btn">View Queues ↗</a>
            """, unsafe_allow_html=True)

def fetch_workflows(name_prefix=None):
    """
    Fetch workflows from localhost:4200/workflows/list endpoint.

    Args:
        name_prefix (str, optional): Filter workflows by name prefix

    Returns:
        list: List of workflow dictionaries sorted by started_at (most recent first)
    """
    api_url = f"{WORKFLOW_API_BASE}/list"
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        workflows = response.json()

        # Filter by name prefix if provided
        if name_prefix:
            workflows = [w for w in workflows if w.get("name", "").startswith(name_prefix)]

        # Sort by started_at descending (most recent first)
        workflows.sort(key=lambda x: x.get("started_at", ""), reverse=True)

        return workflows
    except Exception as e:
        st.error(f"Failed to fetch workflows from API: {e}")
        return []

def format_workflow_status(status):
    """
    Convert temporal workflow status enum to user-friendly display text.

    Args:
        status (str): Temporal workflow status enum

    Returns:
        str: User-friendly status text
    """
    status_mapping = {
        'WORKFLOW_EXECUTION_STATUS_UNSPECIFIED': 'Unknown',
        'WORKFLOW_EXECUTION_STATUS_RUNNING': 'Running',
        'WORKFLOW_EXECUTION_STATUS_COMPLETED': 'Completed',
        'WORKFLOW_EXECUTION_STATUS_FAILED': 'Failed',
        'WORKFLOW_EXECUTION_STATUS_CANCELED': 'Canceled',
        'WORKFLOW_EXECUTION_STATUS_TERMINATED': 'Terminated',
        'WORKFLOW_EXECUTION_STATUS_CONTINUED_AS_NEW': 'Continued',
        'WORKFLOW_EXECUTION_STATUS_TIMED_OUT': 'Timed Out'
    }

    return status_mapping.get(status, status)

def render_workflows_table(workflow_prefix, display_name, show_title=True):
    """
    Fetch and display workflows in a formatted table.

    Args:
        workflow_prefix (str): The prefix to filter workflows by
        display_name (str): The display name for the subheader
        show_title (bool): Whether to show the title (default: True)
    """
    workflows = fetch_workflows(workflow_prefix)
    
    if show_title:
        st.subheader(f"{display_name} Workflows")
    
    if workflows:
        workflows_df = pd.DataFrame(workflows)

        # Convert status enums to user-friendly text
        if 'status' in workflows_df.columns:
            workflows_df['status'] = workflows_df['status'].apply(format_workflow_status)

        # Create temporal URLs for linking. Seems like you can have links in dataframe, but requires
        # LinkColumn and can't customize the display text per cell. Ideally, we just have the run id clickable
        if 'run_id' in workflows_df.columns and 'name' in workflows_df.columns:
            workflows_df['temporal_url'] = workflows_df.apply(
                lambda row: f"http://localhost:8080/namespaces/default/workflows/{row['name']}/{row['run_id']}/history", 
                axis=1
            )

        # Remove the name column from display
        # Used for link, but not that useful on its own
        if 'name' in workflows_df.columns:
            workflows_df = workflows_df.drop(columns=['name'])

        # Rename columns for better display
        workflows_df = workflows_df.rename(columns={
            'run_id': 'Run ID',
            'status': 'Status',
            'started_at': 'Start Time',
            'duration': 'Duration',
            'temporal_url': 'Temporal Link'
        })

        # Configure column display with clickable links
        column_config = {
            "Temporal Link": st.column_config.LinkColumn(
                "Details",
                help="Open workflow history in Temporal UI",
                display_text="View Details ↗"
            )
        }

        st.dataframe(workflows_df, use_container_width=True, column_config=column_config)
    else:
        st.write("No workflows available.")

def fetch_daily_pageviews_data(days_back=14, limit=14):
    """Fetch daily page views data from the materialized view API"""
    try:
        response = requests.get(
            f"{CONSUMPTION_API_BASE}/getDailyPageViews",
            params={
                "days_back": days_back,
                "limit": limit
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            items = data.get("items", [])
            
            if items:
                # Convert to DataFrame for easy manipulation
                df = pd.DataFrame(items)
                # Convert view_date to datetime for proper sorting and display
                df['view_date'] = pd.to_datetime(df['view_date'])
                # Sort by date ascending for chronological display
                df = df.sort_values('view_date')
                return df
            else:
                return pd.DataFrame()
        else:
            st.error(f"Failed to fetch daily page views: {response.status_code}")
            return pd.DataFrame()
            
    except requests.RequestException as e:
        st.error(f"Error fetching daily page views: {str(e)}")
        return pd.DataFrame()
    except Exception as e:
        st.error(f"Unexpected error fetching daily page views: {str(e)}")
        return pd.DataFrame()


def fetch_medical_data(patient_name=None, doctor=None, dental_procedure_name=None, limit=100, should_throw=False):
    """Fetch medical data from the getMedical API"""
    api_url = f"{CONSUMPTION_API_BASE}/getMedical"
    params = {"limit": limit}
    
    if patient_name:
        params["patient_name"] = patient_name
    if doctor:
        params["doctor"] = doctor
    if dental_procedure_name:
        params["dental_procedure_name"] = dental_procedure_name

    try:
        response = requests.get(api_url, params=params)
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])
        df = pd.DataFrame(items)
        return df
    except Exception as e:
        if should_throw:
            raise e
        else:
            print(f"Medical Data API error: {e}")
            st.toast("Error fetching medical data. Check terminal for details.")
        return pd.DataFrame()

def is_data_warehouse_not_ready(error):
    if isinstance(error, ConnectionError):
        error_args = getattr(error, 'args', [])
        return any("Connection refused" in str(arg) for arg in error_args)
    return False