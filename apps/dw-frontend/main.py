import streamlit as st
import time
import requests
import pandas as pd
import random
import streamlit_shadcn_ui as ui

# API base URL
API_BASE = "http://localhost:4200/consumption"

# Page config
st.set_page_config(
    page_title="Data Warehouse Front-end",
    page_icon="🚀",
    layout="wide"
)

# --- FUNCTION DEFINITIONS ---
def set_sidebar_min_width():
    st.markdown(
        """
        <style>
        section[data-testid="stSidebar"] {
            min-width: 200px !important;
            max-width: 200px !important;
            width: 200px !important;
        }
        section[data-testid="stSidebar"] .block-container {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

def get_page_from_query():
    page = st.query_params.get("page", None)
    return page

def set_page_in_query(page):
    st.query_params["page"] = page

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
                        time.sleep(2)
                    
                    # Wait 3 seconds and then fetch DLQ messages
                    with st.spinner("Waiting 3 seconds and fetching DLQ messages..."):
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
                                
                                st.subheader(f"Dead Letter Queue Messages{f' (Filtered for {filter_tag})' if filter_tag else ''}")
                                
                                filtered_messages = []
                                for i, item in enumerate(dlq_data):
                                    if "message" in item and item["message"]:
                                        try:
                                            # Parse the stringified JSON message
                                            import json
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
                                
                                # Display filtered messages
                                if filtered_messages:
                                    for display_idx, (original_idx, item, parsed_message) in enumerate(filtered_messages):
                                        # Extract error message for heading
                                        error_message = parsed_message.get("error_message", "Unknown error")
                                        
                                        st.markdown(f"**Message {display_idx+1} (Partition: {item.get('partition', 'N/A')}, Offset: {item.get('offset', 'N/A')})**")
                                        st.markdown(f"**Error: {error_message}**")
                                        st.json(parsed_message)
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
                    
                    st.session_state[refresh_key] = True
                except Exception as e:
                    st.session_state["extract_status_msg"] = f"Failed to trigger DLQ: {e}"
                    st.session_state["extract_status_type"] = "error"
                    st.session_state["extract_status_time"] = time.time()

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

def sidebar_navigation():
    with st.sidebar:
        st.markdown("## Menu")
        
        # Get current page from query params
        current_page = get_page_from_query() or REPORTS[0]
        
        # All available options in order
        all_options = list(REPORTS) + list(PAGES)
        
        # Find current index, default to 0 if not found
        try:
            current_index = all_options.index(current_page)
        except ValueError:
            current_index = 0
        
        # Radio navigation
        selected_page = st.radio(
            "Navigate to:",
            options=all_options,
            index=current_index,
            key="navigation_radio"
        )
        
        # Update query param if selection changed
        if selected_page != current_page:
            set_page_in_query(selected_page)
            st.rerun()
        
        # Display status messages at the bottom of the sidebar
        if (
            "extract_status_msg" in st.session_state and
            "extract_status_type" in st.session_state and
            "extract_status_time" in st.session_state and
            (time.time() - st.session_state["extract_status_time"]) < 10
        ):
            msg = st.session_state["extract_status_msg"]
            typ = st.session_state["extract_status_type"]
            if typ == "success":
                st.success(msg)
            elif typ == "error":
                st.error(msg)
            elif typ == "warning":
                st.warning(msg)
            elif typ == "info":
                st.info(msg)
    
    return selected_page

# List of valid pages
PAGES = ("All", "S3", "Datadog")
REPORTS = ("Connector analytics",)

# Combine main and reports for navigation
NAV_SECTIONS = [
    ("Reports", list(REPORTS)),
    ("Data Warehouse", list(PAGES)),
]

# --- MAIN LOGIC ---
# List of valid pages
PAGES = ("All", "S3", "Datadog")
REPORTS = ("Connector analytics",)

# Combine main and reports for navigation
NAV_SECTIONS = [
    ("Reports", list(REPORTS)),
    ("Data Warehouse", list(PAGES)),
]

# --- PAGE LOGIC ---
page = get_page_from_query() or REPORTS[0]

if page == "All":
    st.title("Overview")
    if ui.button(text="Trigger Extracts", key="trigger_extracts_btn"):
        with st.spinner("Triggering S3 and Datadog extracts and waiting for backend to finish..."):
            trigger_both_extracts()
            time.sleep(2)
        st.session_state["refresh_data"] = True
    tags_options = ["All", "S3", "Datadog"]
    selected_tag = ui.select(options=tags_options, label="Filter by Tag", key="tag_select")
    df = handle_refresh_and_fetch("refresh_data", selected_tag)
    st.subheader("API Results Table")
    st.dataframe(df)
    if 'name' in df.columns and 'score' in df.columns:
        st.subheader("Score by Name")
        chart_data = df[["name", "score"]].set_index("name")
        st.bar_chart(chart_data)
    if (
        "extract_status_msg" in st.session_state and
        "extract_status_time" in st.session_state and
        (time.time() - st.session_state["extract_status_time"]) < 10
    ):
        pass  # Status is now shown in sidebar
    else:
        st.session_state.pop("extract_status_msg", None)
        st.session_state.pop("extract_status_type", None)
        st.session_state.pop("extract_status_time", None)

elif page == "S3":
    st.title("S3 View")
    df = handle_refresh_and_fetch(
        "refresh_s3",
        "S3",
        trigger_func=lambda: trigger_extract(f"{API_BASE}/extract-s3", "S3"),
        trigger_label="S3",
        button_label=None  # We'll use ShadCN button below
    )
    
    if ui.button(text="Trigger S3 Extract", key="trigger_s3_btn"):
        with st.spinner("Triggering S3 extract and waiting for backend to finish..."):
            trigger_extract(f"{API_BASE}/extract-s3", "S3")
            time.sleep(2)
        st.session_state["refresh_s3"] = True
    
    st.subheader("S3 Items Table")
    if not df.empty and "large_text" in df.columns:
        parsed = df["large_text"].str.split("|", n=3, expand=True)
        parsed.columns = ["Ingested On", "S3 Location", "Permissions", "Resource size"]
        parsed = parsed.apply(lambda col: col.str.strip())
        if "Processed On" in df.columns:
            parsed.insert(1, "Processed On", df["Processed On"])
        st.dataframe(parsed, use_container_width=True)
    else:
        st.write("No S3 log data available.")
    
    # Use the reusable DLQ controls function
    render_dlq_controls("extract-s3", "refresh_s3")
elif page == "Datadog":
    st.title("Datadog View")
    df = handle_refresh_and_fetch(
        "refresh_datadog",
        "Datadog",
        trigger_func=lambda: trigger_extract(f"{API_BASE}/extract-datadog", "Datadog"),
        trigger_label="Datadog",
        button_label=None  # We'll use ShadCN button below
    )
    if ui.button(text="Trigger Datadog Extract", key="trigger_datadog_btn"):
        with st.spinner("Triggering Datadog extract and waiting for backend to finish..."):
            trigger_extract(f"{API_BASE}/extract-datadog", "Datadog")
            time.sleep(2)
        st.session_state["refresh_datadog"] = True
    st.subheader("Datadog Items Table")
    if not df.empty:
        log_col = df.columns[-1]
        parsed_logs = df[log_col].str.split("|", n=2, expand=True)
        parsed_logs.columns = ["Level", "Timestamp", "Message"]
        if "Processed On" in df.columns:
            parsed_logs.insert(1, "Processed On", df["Processed On"])
        st.dataframe(parsed_logs, use_container_width=True)
    else:
        st.write("No Datadog log data available.")
    
    # Use the reusable DLQ controls function
    render_dlq_controls("extract-datadog", "refresh_datadog")
elif page == "Connector analytics":
    # Modern animated banner
    st.markdown("""
        <style>
            .modern-banner {
                background: black;
                color: white;
                padding: 2rem;
                text-align: center;
                font-size: 1.7rem;
                font-weight: 600;
                font-family: 'Segoe UI', sans-serif;
                border-radius: 15px;
                animation: slideFadeIn 0.8s ease-out, pulse 2.5s ease-in-out infinite;
                margin-bottom: 2rem;
            }
            @keyframes slideFadeIn {
                0% { transform: translateY(-20px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
            @keyframes pulse {
                0% { box-shadow: 0 0 12px rgba(255, 255, 255, 0.2); }
                50% { box-shadow: 0 0 28px rgba(255, 255, 255, 0.45); }
                100% { box-shadow: 0 0 12px rgba(255, 255, 255, 0.2); }
            }
        </style>
        <div class="modern-banner">
            Data Warehouse Front-end
        </div>
    """, unsafe_allow_html=True)
    st.title("Connector Analytics Report")
    # Add Update button to trigger both extracts
    if ui.button(text="Update", key="update_btn"):
        with st.spinner("Triggering S3 and Datadog extracts and waiting for backend to finish..."):
            trigger_extract(f"{API_BASE}/extract-s3", "S3")
            trigger_extract(f"{API_BASE}/extract-datadog", "Datadog")
            time.sleep(2)

    # Fetch all data (no tag filter)
    df = fetch_data("All")
    if df.empty:
        st.session_state["extract_status_msg"] = "No data available for analytics."
        st.session_state["extract_status_type"] = "warning"
    else:
        # --- S3 vs Datadog breakdown ---
        def detect_source(tags):
            if isinstance(tags, list):
                if any("s3" in t.lower() for t in tags):
                    return "S3"
                if any("datadog" in t.lower() for t in tags):
                    return "Datadog"
            return "Other"
        df["Source"] = df["tags"].apply(detect_source)
        breakdown = df["Source"].value_counts().reset_index()
        breakdown.columns = ["Connector", "Count"]
        # Convert Count to string for consistent left alignment
        breakdown["Count"] = breakdown["Count"].astype(str)
        st.subheader("Connector Entity Breakdown")
        st.dataframe(breakdown, hide_index=True)
        # --- Items per minute chart ---
        if "Processed On" in df.columns:
            df["Processed On (minute)"] = pd.to_datetime(df["Processed On"], errors="coerce").dt.floor("min")
            per_min = df.groupby(["Processed On (minute)", "Source"]).size().reset_index(name="Count")
            per_min_pivot = per_min.pivot(index="Processed On (minute)", columns="Source", values="Count").fillna(0)
            per_min_pivot = per_min_pivot.sort_index()
            st.subheader("Total Items Per Minute by Connector")
            st.bar_chart(per_min_pivot)
        else:
            st.session_state["extract_status_msg"] = "No timestamp data available for per-minute chart."
            st.session_state["extract_status_type"] = "info"

# Now render the sidebar with the latest status
sidebar_navigation()

# After rendering, clear the status so it doesn't persist
st.session_state.pop("extract_status_msg", None)
st.session_state.pop("extract_status_type", None)
st.session_state.pop("extract_status_time", None)

# Footer
st.markdown("---")
st.markdown("""
<div style='text-align: center'>
                <span style='font-size:.8rem;'>Made with MOOSE</span><br>
    <span style='font-size:.8rem;'><a href="https://docs.fiveonefour.com/moose" style="color:#4FC3F7;" target="_blank">Learn More: docs.fiveonefour.com/moose</a></span>
</div>
""", unsafe_allow_html=True)
