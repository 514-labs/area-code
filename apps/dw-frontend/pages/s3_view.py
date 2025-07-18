import streamlit as st
import time
import pandas as pd
import streamlit_shadcn_ui as ui

# Import shared functions
from utils.api_functions import fetch_data, trigger_extract, handle_refresh_and_fetch, render_dlq_controls
from utils.constants import API_BASE

def show():
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
        st.rerun()
    
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
    
    # Always check for and display existing DLQ data
    dlq_messages_key = "dlq_messages_extract-s3"
    if dlq_messages_key in st.session_state and st.session_state[dlq_messages_key]:
        filter_tag = "S3"
        st.subheader(f"Dead Letter Queue Messages (Filtered for {filter_tag})")
        st.markdown("**These entries have been auto resolved.**")

        # Status line showing count of retrieved items and offset tracking
        item_count = len(st.session_state[dlq_messages_key])
        highest_offset_key = "dlq_highest_offset_extract-s3"
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
                raw_messages_key = "dlq_raw_messages_extract-s3"
                if raw_messages_key in st.session_state and selected_idx < len(st.session_state[raw_messages_key]):
                    original_json = st.session_state[raw_messages_key][selected_idx]
                    st.json(original_json)
                else:
                    st.error("Original JSON data not available for this message.") 