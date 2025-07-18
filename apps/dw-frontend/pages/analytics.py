import streamlit as st
import time
import pandas as pd
import streamlit_shadcn_ui as ui

# Import shared functions
from utils.api_functions import fetch_data, trigger_extract
from utils.constants import API_BASE

def show():
    connector_counts = {"S3": 0, "Datadog": 0}

    col1, col2 = st.columns([5, 1])
    with col1:
        st.markdown("<h2 style='margin: 0; line-height: 1;'>Connector Analytics Report</h2>", unsafe_allow_html=True)
    with col2:
        # Use empty space to push button to the right
        st.markdown("<div style='margin-top: 12px;'></div>", unsafe_allow_html=True)
        # Create three sub-columns to push the button to the right
        _, _, button_col = st.columns([1, 1, 1])
        with button_col:
            if ui.button(text="Update", key="update_btn", size="sm"):
                with st.spinner(""):
                    trigger_extract(f"{API_BASE}/extract-s3", "S3")
                    trigger_extract(f"{API_BASE}/extract-datadog", "Datadog")
                    time.sleep(2)

    # Fetch all data (no tag filter)
    df = fetch_data("All")

    if not df.empty:
        # --- S3 vs Datadog breakdown ---
        def detect_source(tags):
            if isinstance(tags, list):
                if any("s3" in t.lower() for t in tags):
                    return "S3"
                if any("datadog" in t.lower() for t in tags):
                    return "Datadog"
            return "Other"
        
        df["Source"] = df["tags"].apply(detect_source)
        actual_counts = df["Source"].value_counts().to_dict()
        
        # Update counts with actual data
        for connector, count in actual_counts.items():
            if connector in connector_counts:
                connector_counts[connector] = count
    else:
        st.session_state["extract_status_msg"] = "No data available for analytics."
        st.session_state["extract_status_type"] = "warning"

    # Metric cards
    cols = st.columns(len(connector_counts))
    for idx, (connector, count) in enumerate(connector_counts.items()):
        with cols[idx]:
            ui.metric_card(
                title=connector,
                content=str(count),
                description=f"Total entities from {connector} connector"
            )
        
    # --- Items per minute chart ---
    if not df.empty and "Processed On" in df.columns:
        df["Processed On (minute)"] = pd.to_datetime(df["Processed On"], errors="coerce").dt.floor("min")
        per_min = df.groupby(["Processed On (minute)", "Source"]).size().reset_index(name="Count")
        per_min_pivot = per_min.pivot(index="Processed On (minute)", columns="Source", values="Count").fillna(0)
        per_min_pivot = per_min_pivot.sort_index()
        
        st.subheader("Total Items Per Minute by Connector")
        st.bar_chart(per_min_pivot)
    else:
        st.subheader("Total Items Per Minute by Connector")
        st.write("No data available for per-minute chart.")