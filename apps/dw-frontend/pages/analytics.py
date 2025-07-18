import streamlit as st
import time
import pandas as pd
import streamlit_shadcn_ui as ui

# Import shared functions
from utils.api_functions import fetch_data, trigger_extract
from utils.constants import API_BASE

def show():
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
        
        # Create metric cards for each connector
        cols = st.columns(len(breakdown))
        for idx, (connector, count) in enumerate(zip(breakdown["Connector"], breakdown["Count"])):
            with cols[idx]:
                ui.metric_card(
                    title=connector,
                    content=count,
                    description=f"Total entities from {connector} connector"
                )
        
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