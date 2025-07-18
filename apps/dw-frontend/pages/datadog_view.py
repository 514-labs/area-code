import streamlit as st
import time
import pandas as pd
import streamlit_shadcn_ui as ui

# Import shared functions
from utils.api_functions import fetch_data, trigger_extract, handle_refresh_and_fetch, render_dlq_controls
from utils.constants import API_BASE

def show():
    level_counts = {"INFO": 0, "DEBUG": 0, "ERROR": 0}

    col1, col2 = st.columns([5, 1])
    with col1:
        st.markdown("<h2 style='margin: 0; line-height: 1;'>Datadog View</h2>", unsafe_allow_html=True)
    with col2:
        # Use empty space to push button to the right
        st.markdown("<div style='margin-top: 12px;'></div>", unsafe_allow_html=True)
        # Create three sub-columns to push the button to the right
        _, _, button_col = st.columns([1, 1, 1])
        with button_col:
            if ui.button(text="Extract", key="trigger_datadog_btn", size="sm"):
                with st.spinner(""):
                    trigger_extract(f"{API_BASE}/extract-datadog", "Datadog")
                    time.sleep(2)
                st.session_state["refresh_datadog"] = True
                st.rerun()

    df = handle_refresh_and_fetch(
        "refresh_datadog",
        "Datadog",
        trigger_func=lambda: trigger_extract(f"{API_BASE}/extract-datadog", "Datadog"),
        trigger_label="Datadog",
        button_label=None  # We'll use ShadCN button below
    )

    # Parse logs and count levels if data exists
    if not df.empty:
        log_col = df.columns[-1]
        parsed_logs = df[log_col].str.split("|", n=2, expand=True)
        parsed_logs.columns = ["Level", "Timestamp", "Message"]
        if "Processed On" in df.columns:
            parsed_logs.insert(1, "Processed On", df["Processed On"])

        # Update counts with actual data
        actual_counts = parsed_logs["Level"].value_counts().to_dict()
        for level, count in actual_counts.items():
            level_upper = level.upper().strip()
            if level_upper in level_counts:
                level_counts[level_upper] = count

    # Metric cards
    cols = st.columns(len(level_counts))
    for idx, (level, count) in enumerate(level_counts.items()):
        with cols[idx]:
            ui.metric_card(
                title=level.title(),
                content=str(count),
                key=f"datadog_metric_{level.lower()}"
            )

    st.subheader("Datadog Items Table")
    if not df.empty:
        st.dataframe(parsed_logs, use_container_width=True)
    else:
        st.write("No Datadog log data available.")
    
    # Use the reusable DLQ controls function
    render_dlq_controls("extract-datadog", "refresh_datadog")
    
    # Always check for and display existing DLQ data
    dlq_messages_key = "dlq_messages_extract-datadog"
    if dlq_messages_key in st.session_state and st.session_state[dlq_messages_key]:
        filter_tag = "Datadog"
        st.subheader(f"Dead Letter Queue Messages (Filtered for {filter_tag})")
        st.markdown("**These entries have been auto resolved.**")
        
        # Status line showing count of retrieved items and offset tracking
        item_count = len(st.session_state[dlq_messages_key])
        highest_offset_key = "dlq_highest_offset_extract-datadog"
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
                raw_messages_key = "dlq_raw_messages_extract-datadog"
                if raw_messages_key in st.session_state and selected_idx < len(st.session_state[raw_messages_key]):
                    original_json = st.session_state[raw_messages_key][selected_idx]
                    st.json(original_json)
                else:
                    st.error("Original JSON data not available for this message.") 