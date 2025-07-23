import streamlit as st
import time
import pandas as pd
import streamlit_shadcn_ui as ui

# Import shared functions
from utils.api_functions import fetch_data, trigger_extract
from utils.constants import CONSUMPTION_API_BASE

def show():
    connector_counts = {"Blob": 0, "Log": 0, "Event": 0}

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