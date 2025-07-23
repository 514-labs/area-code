import streamlit as st
import time
import pandas as pd
import streamlit_shadcn_ui as ui

# Import shared functions
from utils.api_functions import fetch_data, trigger_extract, handle_refresh_and_fetch, render_dlq_controls, render_workflows_table
from utils.constants import CONSUMPTION_API_BASE

def show():
    event_counts = {"pageview": 0, "signup": 0, "click": 0, "purchase": 0}

    col1, col2 = st.columns([5, 1])
    with col1:
        st.markdown("<h2 style='margin: 0; line-height: 1;'>Events View</h2>", unsafe_allow_html=True)
    with col2:
        # Use empty space to push button to the right
        st.markdown("<div style='margin-top: 12px;'></div>", unsafe_allow_html=True)
        # Create three sub-columns to push the button to the right
        _, _, button_col = st.columns([1, 1, 1])
        with button_col:
            if ui.button(text="Extract", key="trigger_events_btn", size="sm"):
                with st.spinner(""):
                    trigger_extract(f"{CONSUMPTION_API_BASE}/extract-events", "Events")
                    time.sleep(2)
                st.session_state["refresh_events"] = True
                st.rerun()
    
    df = handle_refresh_and_fetch(
        "refresh_events",
        "Events",
        trigger_func=lambda: trigger_extract(f"{CONSUMPTION_API_BASE}/extract-events", "Events"),
        trigger_label="Events",
        button_label=None  # We'll use ShadCN button below
    )

    # Parse Events data and extract event types
    parsed = None
    if not df.empty and "large_text" in df.columns:
        parsed = df["large_text"].str.split("|", n=5, expand=True)
        parsed.columns = ["Event Name", "Timestamp", "User ID", "Session ID", "Project ID", "Properties"]
        parsed = parsed.apply(lambda col: col.str.strip())
        if "Processed On" in df.columns:
            parsed.insert(1, "Processed On", df["Processed On"])

        event_names = parsed["Event Name"].fillna("")
        actual_counts = event_names.value_counts().to_dict()

        # Update counts with actual data, focusing on key event types
        for event_name, count in actual_counts.items():
            if event_name in event_counts:
                event_counts[event_name] = count
        
        # Add "other" category for events not in our main categories
        other_count = sum(count for event_name, count in actual_counts.items() 
                         if event_name not in event_counts)
        if other_count > 0:
            event_counts["other"] = other_count

    # Metric cards
    cols = st.columns(len(event_counts))
    for idx, (event_type, count) in enumerate(event_counts.items()):
        with cols[idx]:
            ui.metric_card(
                title=event_type.title(),
                content=str(count),
                key=f"events_metric_{event_type}"
            )

    # Show workflow runs
    render_workflows_table("events-workflow", "Events")

    st.subheader("Events Items Table")
    if parsed is not None:
        st.dataframe(parsed, use_container_width=True)
    else:
        st.write("No events data available.")
    
    # Use the reusable DLQ controls function
    render_dlq_controls("extract-events", "refresh_events")
    
    # Always check for and display existing DLQ data
    dlq_messages_key = "dlq_messages_extract-events"
    if dlq_messages_key in st.session_state and st.session_state[dlq_messages_key]:
        filter_tag = "Events"
        st.subheader(f"Dead Letter Queue Messages (Filtered for {filter_tag})")
        st.markdown("**These entries have been auto resolved.**")

        # Status line showing count of retrieved items and offset tracking
        item_count = len(st.session_state[dlq_messages_key])
        highest_offset_key = "dlq_highest_offset_extract-events"
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
                raw_messages_key = "dlq_raw_messages_extract-events"
                if raw_messages_key in st.session_state and selected_idx < len(st.session_state[raw_messages_key]):
                    original_json = st.session_state[raw_messages_key][selected_idx]
                    st.json(original_json)
                else:
                    st.error("Original JSON data not available for this message.") 