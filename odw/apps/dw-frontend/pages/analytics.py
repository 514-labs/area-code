import streamlit as st
import time
import pandas as pd
import streamlit_shadcn_ui as ui

# Import shared functions
from utils.api_functions import fetch_data, trigger_extract
from utils.constants import CONSUMPTION_API_BASE
from utils.tooltip_utils import title_with_button

def show():
    connector_counts = {"Blob": 0, "Log": 0, "Event": 0}

    # Header with button inline
    if title_with_button("Connector Analytics Report", "Refresh", "update_btn", button_size="sm"):
        with st.spinner(""):
            trigger_extract(f"{CONSUMPTION_API_BASE}/extract-blob", "Blob")
            trigger_extract(f"{CONSUMPTION_API_BASE}/extract-logs", "Logs")
            trigger_extract(f"{CONSUMPTION_API_BASE}/extract-events", "Events")
            time.sleep(2)

    # Fetch all data (no tag filter) - this will return the unified normalized view
    df = fetch_data("All")

    if not df.empty:
        # --- Blob vs Logs vs Events breakdown ---
        # With the new unified view, we can directly use the Type column
        if "Type" in df.columns:
            actual_counts = df["Type"].value_counts().to_dict()

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
                description=f"Total entities from {connector.lower()} connector",
                key=f"analytics_metric_{connector.lower()}"
            )

    # Data summary table
    st.subheader("Recent Data Summary")
    if not df.empty:
        # Show a sample of recent data
        recent_data = df.head(10)
        st.dataframe(recent_data, use_container_width=True)
    else:
        st.write("No recent data available.")