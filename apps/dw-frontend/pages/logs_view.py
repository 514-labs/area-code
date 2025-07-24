import streamlit as st
import time
import pandas as pd
import streamlit_shadcn_ui as ui

# Import shared functions
from utils.api_functions import fetch_log_data, trigger_extract, render_dlq_controls, render_workflows_table
from utils.constants import CONSUMPTION_API_BASE

def truncate_message(message, max_length=100):
    """Truncate long messages for table display"""
    message_str = str(message)
    return message_str[:max_length] + "..." if len(message_str) > max_length else message_str

def format_timestamp(timestamp):
    """Format timestamp for better readability"""
    try:
        return pd.to_datetime(timestamp).strftime("%Y-%m-%d %H:%M:%S")
    except:
        return str(timestamp)

def prepare_log_display_data(df):
    """Transform log data for display with clean configuration"""
    if df.empty:
        return None

    # Column transformations configuration
    transformations = {
        "Message Preview": ("message", truncate_message),
        "Log Timestamp": ("timestamp", format_timestamp),
    }

    # Column display mapping
    display_columns = {
        "id": "ID",
        "level": "Level",
        "source": "Source",
        "trace_id": "Trace ID"
    }

    display_df = df.copy()

    # Apply transformations
    for display_name, (source_col, transform_func) in transformations.items():
        if source_col in display_df.columns:
            display_df[display_name] = display_df[source_col].apply(transform_func)

    # Build final column list
    final_columns = []
    for source_col, display_name in display_columns.items():
        if source_col in display_df.columns:
            final_columns.append(display_name)

    # Add computed columns that exist
    for computed_col in transformations.keys():
        if computed_col in display_df.columns:
            final_columns.append(computed_col)

    # Rename and select
    display_df = display_df.rename(columns=display_columns)
    return display_df[final_columns]

def show():
    level_counts = {"INFO": 0, "DEBUG": 0, "WARN": 0, "ERROR": 0}

    # Header with button underneath
    st.markdown("<h2 style='margin: 0; margin-bottom: 0.5rem;'>Logs View</h2>", unsafe_allow_html=True)
    
    if ui.button(text="Pull via connectors", key="trigger_logs_btn", size="sm"):
        with st.spinner(""):
            trigger_extract(f"{CONSUMPTION_API_BASE}/extract-logs", "Logs")
            time.sleep(2)
        st.session_state["refresh_logs"] = True
        st.rerun()

    # Fetch log data directly
    if "refresh_logs" not in st.session_state:
        st.session_state["refresh_logs"] = False

    if st.session_state.get("refresh_logs", False):
        df = fetch_log_data()
        st.session_state["refresh_logs"] = False
    else:
        df = fetch_log_data()

    # Update level counts
    if not df.empty and "level" in df.columns:
        actual_counts = df["level"].value_counts().to_dict()
        for level, count in actual_counts.items():
            level_upper = level.upper().strip()
            if level_upper in level_counts:
                level_counts[level_upper] = count

    # Transform data for display
    display_df = prepare_log_display_data(df)

    # Metric cards
    cols = st.columns(len(level_counts))
    for idx, (level, count) in enumerate(level_counts.items()):
        with cols[idx]:
            ui.metric_card(
                title=level.title(),
                content=str(count),
                key=f"logs_metric_{level.lower()}"
            )

    # Show workflow runs
    render_workflows_table("logs-workflow", "Logs")

    st.divider()
    st.subheader("Logs Table")
    if display_df is not None and not display_df.empty:
        st.dataframe(display_df, use_container_width=True)
    else:
        st.write("No logs data available.")
    
    # Use the reusable DLQ controls function
    render_dlq_controls("extract-logs", "refresh_logs")
    
    # Always check for and display existing DLQ data
    dlq_messages_key = "dlq_messages_extract-logs"
    if dlq_messages_key in st.session_state and st.session_state[dlq_messages_key]:
        filter_tag = "Logs"
        st.subheader(f"Dead Letter Queue Messages (Filtered for {filter_tag})")
        st.markdown("**These entries have been auto resolved.**")
        
        # Status line showing count of retrieved items and offset tracking
        item_count = len(st.session_state[dlq_messages_key])
        highest_offset_key = "dlq_highest_offset_extract-logs"
        current_highest_offset = st.session_state.get(highest_offset_key, -1)
        st.info(f"📊 Retrieved {item_count} new DLQ message{'s' if item_count != 1 else ''} matching {filter_tag} filter (showing messages after offset {current_highest_offset})")
        
        # Create and display DataFrame at full width
        df_dlq = pd.DataFrame(st.session_state[dlq_messages_key])
        
        # Add selection capability to the dataframe
        selected_rows = st.dataframe(
            df_dlq, 
            use_container_width=True, 
            height=400,
            on_select="rerun",
            selection_mode="single-row"
        )
        
        # Display JSON for selected row
        if selected_rows.selection.rows:
            selected_idx = selected_rows.selection.rows[0]
            if selected_idx < len(st.session_state[dlq_messages_key]):
                st.subheader(f"JSON Details for Message #{selected_idx + 1}")
                
                # Get the original parsed message from session state
                raw_messages_key = "dlq_raw_messages_extract-logs"
                if raw_messages_key in st.session_state and selected_idx < len(st.session_state[raw_messages_key]):
                    original_json = st.session_state[raw_messages_key][selected_idx]
                    st.json(original_json)
                else:
                    st.error("Original JSON data not available for this message.") 