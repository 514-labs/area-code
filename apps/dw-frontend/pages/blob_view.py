import streamlit as st
import time
import pandas as pd
import streamlit_shadcn_ui as ui

# Import shared functions
from utils.api_functions import fetch_blob_data, trigger_extract, render_dlq_controls, render_workflows_table
from utils.constants import CONSUMPTION_API_BASE

def format_file_size(size_bytes):
    """Format file size in human readable format"""
    if size_bytes < 1024:
        return f"{size_bytes:,} bytes"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes/1024:.1f} KB"
    else:
        return f"{size_bytes/(1024*1024):.1f} MB"

def format_permissions(permissions):
    """Format permissions list as comma-separated string"""
    return ", ".join(permissions) if isinstance(permissions, list) else str(permissions)

def prepare_blob_display_data(df):
    """Transform blob data for display with clean configuration"""
    if df.empty:
        return None

    # Column transformations configuration
    transformations = {
        # Format computed columns
        "Size": ("file_size", format_file_size),
        "Permissions": ("permissions", format_permissions),
        "Full Path": ("file_path", lambda row: f"{row['bucket_name']}{row['file_path']}{row['file_name']}"
                     if all(col in row for col in ['bucket_name', 'file_path', 'file_name']) else ""),
    }

    # Column display mapping
    display_columns = {
        "id": "ID",
        "file_name": "File Name",
        "bucket_name": "Bucket",
        "content_type": "Content Type"
    }

    display_df = df.copy()

    # Apply transformations
    for display_name, (source_col, transform_func) in transformations.items():
        if source_col in display_df.columns:
            if display_name == "Full Path":
                # Special case for multi-column transformation
                display_df[display_name] = display_df.apply(transform_func, axis=1)
            else:
                display_df[display_name] = display_df[source_col].apply(transform_func)

    # Select and rename columns
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
    file_type_counts = {"json": 0, "csv": 0, "txt": 0}

    # Header with button underneath
    st.markdown("<h2 style='margin: 0; margin-bottom: 0.5rem;'>Blob View</h2>", unsafe_allow_html=True)
    
    if ui.button(text="Pull via connectors", key="trigger_blob_btn", size="sm"):
        with st.spinner(""):
            trigger_extract(f"{CONSUMPTION_API_BASE}/extract-blob", "Blob")
            time.sleep(2)
        st.session_state["refresh_blob"] = True
        st.rerun()
    
    # Fetch blob data directly
    if "refresh_blob" not in st.session_state:
        st.session_state["refresh_blob"] = False

    if st.session_state.get("refresh_blob", False):
        df = fetch_blob_data()
        st.session_state["refresh_blob"] = False
    else:
        df = fetch_blob_data()

    # Update file type counts
    if not df.empty and "file_name" in df.columns:
        extensions = df["file_name"].str.extract(r'\.([a-zA-Z0-9]+)$')[0].fillna("no_ext")
        actual_counts = extensions.value_counts().to_dict()
        for file_type in file_type_counts.keys():
            if file_type in actual_counts:
                file_type_counts[file_type] = actual_counts[file_type]

    # Transform data for display
    display_df = prepare_blob_display_data(df)

    # Metric cards
    cols = st.columns(len(file_type_counts))
    for idx, (file_type, count) in enumerate(file_type_counts.items()):
        with cols[idx]:
            ui.metric_card(
                title=file_type.upper(),
                content=str(count),
                key=f"blob_metric_{file_type}"
            )

    # Show workflow runs
    render_workflows_table("blob-workflow", "Blob")

    st.divider()
    st.subheader("Blob Table")
    if display_df is not None and not display_df.empty:
        st.dataframe(display_df, use_container_width=True)
    else:
        st.write("No blob data available.")
    
    # Use the reusable DLQ controls function
    render_dlq_controls("extract-blob", "refresh_blob")
    
    # Always check for and display existing DLQ data
    dlq_messages_key = "dlq_messages_extract-blob"
    if dlq_messages_key in st.session_state and st.session_state[dlq_messages_key]:
        filter_tag = "Blob"
        st.subheader(f"Dead Letter Queue Messages (Filtered for {filter_tag})")
        st.markdown("**These entries have been auto resolved.**")

        # Status line showing count of retrieved items and offset tracking
        item_count = len(st.session_state[dlq_messages_key])
        highest_offset_key = "dlq_highest_offset_extract-blob"
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
                raw_messages_key = "dlq_raw_messages_extract-blob"
                if raw_messages_key in st.session_state and selected_idx < len(st.session_state[raw_messages_key]):
                    original_json = st.session_state[raw_messages_key][selected_idx]
                    st.json(original_json)
                else:
                    st.error("Original JSON data not available for this message.") 