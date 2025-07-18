import streamlit as st
import time
import requests
import pandas as pd
import random
import json
import streamlit_shadcn_ui as ui

from .constants import API_BASE

def fetch_data(tag):
    api_url = f"{API_BASE}/getBars?tag={tag}"
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])
        df = pd.DataFrame(items)
        if not df.empty and "transform_timestamp" in df.columns:
            df["Processed On"] = pd.to_datetime(df["transform_timestamp"]).dt.strftime("%Y-%m-%d %H:%M:%S")
            cols = list(df.columns)
            cols.insert(1, cols.pop(cols.index("Processed On")))
            df = df[cols]
            df = df.drop(columns=["transform_timestamp"])
        return df
    except Exception as e:
        st.error(f"Failed to fetch data from API: {e}")
        return pd.DataFrame()

def trigger_extract(api_url, label):
    batch_size = random.randint(10, 100)
    url = f"{api_url}?batch_size={batch_size}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        st.session_state["extract_status_msg"] = f"{label} extract triggered with batch size {batch_size}."
        st.session_state["extract_status_type"] = "success"
        st.session_state["extract_status_time"] = time.time()
    except Exception as e:
        st.session_state["extract_status_msg"] = f"Failed to trigger {label} extract (batch size {batch_size}): {e}"
        st.session_state["extract_status_type"] = "error"
        st.session_state["extract_status_time"] = time.time()

def trigger_both_extracts():
    trigger_extract(f"{API_BASE}/extract-s3", "S3")
    trigger_extract(f"{API_BASE}/extract-datadog", "Datadog")

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

def render_dlq_controls(endpoint_path, refresh_key):
    """
    Renders DLQ testing controls with batch size and failure percentage inputs.
    
    Args:
        endpoint_path (str): The API endpoint path (e.g., "extract-s3", "extract-datadog")
        refresh_key (str): The session state key for refreshing data after DLQ trigger
    """
    # DLQ section positioned below the table and to the left
    st.markdown("**Dead Letter Queue Testing**")
    
    # Create columns to keep DLQ controls on the left side
    dlq_col, _ = st.columns([1, 2])
    
    # Store the filtered messages in session state so we can display them outside the column
    dlq_messages_key = f"dlq_messages_{endpoint_path}"
    
    with dlq_col:
        # Input fields for batch size and failure percentage
        batch_size = st.number_input(
            "Batch size", 
            min_value=1, 
            max_value=1000, 
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
                if batch_size < 1 or batch_size > 1000:
                    st.error("Batch size must be between 1 and 1000")
                elif failure_percentage < 0 or failure_percentage > 100:
                    st.error("Failure percentage must be between 0 and 100")
                else:
                    # Make the DLQ request
                    dlq_url = f"{API_BASE}/{endpoint_path}?batch_size={batch_size}&fail_percentage={failure_percentage}"
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
                        dlq_messages_url = "http://localhost:9999/topic/FooDeadLetterQueue/messages?partition=0&offset=0&count=100&isAnyProto=false"
                        
                        try:
                            # Add JSON headers to request JSON response
                            headers = {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            }
                            dlq_response = requests.get(dlq_messages_url, headers=headers)
                            dlq_response.raise_for_status()                            
                            dlq_data = dlq_response.json()
                            
                            # Display DLQ messages
                            if dlq_data:
                                # Determine filter type based on endpoint
                                filter_tag = "S3" if "extract-s3" in endpoint_path else "Datadog" if "extract-datadog" in endpoint_path else None
                                
                                # Get the current highest offset for this endpoint to avoid duplicates
                                highest_offset_key = f"dlq_highest_offset_{endpoint_path}"
                                current_highest_offset = st.session_state.get(highest_offset_key, -1)
                                new_highest_offset = current_highest_offset
                                                                
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
                                            
                                            # Check if we should filter by tags
                                            if filter_tag:
                                                original_record = parsed_message.get("original_record", {})
                                                tags = original_record.get("tags", [])
                                                
                                                # Only include messages that have the matching tag
                                                if not any(filter_tag.lower() in str(tag).lower() for tag in tags):
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
                                        
                                        row = {
                                            "#": display_idx + 1,
                                            "Partition": item.get('partition', 'N/A'),
                                            "Offset": item.get('offset', 'N/A'),
                                            "Error Message": parsed_message.get("error_message", "Unknown error"),
                                            "Error Type": parsed_message.get("error_type", "Unknown"),
                                            "Failed At": parsed_message.get("failed_at", "Unknown"),
                                            "Record ID": original_record.get("id", "Unknown"),
                                            "Record Name": original_record.get("name", "Unknown"),
                                            "Status": original_record.get("status", "Unknown"),
                                            "Tags": ", ".join(original_record.get("tags", [])) if original_record.get("tags") else "None",
                                            "Score": original_record.get("score", "Unknown")
                                        }
                                        table_data.append(row)
                                        raw_json_data.append(parsed_message)
                                    
                                    # Store both table data and raw JSON in session state
                                    st.session_state[dlq_messages_key] = table_data
                                    st.session_state[f"dlq_raw_messages_{endpoint_path}"] = raw_json_data
                                    
                                    # Update the highest offset for this endpoint
                                    st.session_state[highest_offset_key] = new_highest_offset
                                else:
                                    # Clear any existing data and show info message
                                    st.session_state[dlq_messages_key] = []
                                    st.session_state[f"dlq_raw_messages_{endpoint_path}"] = []
                                    
                                    # Still update the highest offset even if no new filtered messages
                                    if new_highest_offset > current_highest_offset:
                                        st.session_state[highest_offset_key] = new_highest_offset
                                        st.info(f"No new {filter_tag + ' ' if filter_tag else ''}messages found in the Dead Letter Queue since last check.")
                                    else:
                                        st.info(f"No {filter_tag + ' ' if filter_tag else ''}messages found in the Dead Letter Queue.")
                            else:
                                st.info("No messages found in the Dead Letter Queue.")
                                
                        except requests.exceptions.RequestException as e:
                            st.error(f"Failed to fetch DLQ messages: {e}")
                        except json.JSONDecodeError as e:
                            st.error(f"Failed to parse DLQ response as JSON: {e}")
                            st.text(f"Response status: {dlq_response.status_code}")
                            st.text(f"Response headers: {dict(dlq_response.headers)}")
                            st.text(f"Response content: {dlq_response.text}")
                    
                    # Refresh the main items table after all DLQ processing is complete
                    st.session_state[refresh_key] = True
                    st.rerun()  # Force immediate page refresh to show updated data
                except Exception as e:
                    st.session_state["extract_status_msg"] = f"Failed to trigger DLQ: {e}"
                    st.session_state["extract_status_type"] = "error"
                    st.session_state["extract_status_time"] = time.time()
        
        with btn_col2:
            st.link_button("Explorer", "http://localhost:9999") 