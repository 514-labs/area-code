import streamlit as st
import time
import requests
import pandas as pd
import streamlit_shadcn_ui as ui

# Import shared functions
from utils.api_functions import fetch_data, fetch_event_analytics, trigger_all_extracts, handle_refresh_and_fetch

def show():
    # Header with button underneath
    st.markdown("<h2 style='margin: 0; margin-bottom: 0.5rem;'>Overview</h2>", unsafe_allow_html=True)
    
    if ui.button(text="Pull via connectors", key="trigger_extracts_btn", size="sm"):
        with st.spinner(""):
            trigger_all_extracts()
            time.sleep(2)
        st.session_state["refresh_data"] = True
    
    tags_options = ["All", "Blob", "Logs", "Events"]
    selected_tag = ui.select(options=tags_options, label="Filter by Tag", key="tag_select")
    df = handle_refresh_and_fetch("refresh_data", selected_tag)
    
    # Show event analytics when Events is selected or All
    if selected_tag in ["All", "Events"]:
        st.subheader("Event Analytics (24h)")
        analytics = fetch_event_analytics(hours=24)
        if analytics and "user_metrics" in analytics:
            metrics = analytics["user_metrics"]
            metric_cols = st.columns(3)
            with metric_cols[0]:
                st.metric("Unique Users", metrics.get("unique_users", 0))
            with metric_cols[1]:
                st.metric("Active Sessions", metrics.get("unique_sessions", 0))
            with metric_cols[2]:
                st.metric("Total Events", metrics.get("total_events", 0))
    
    st.divider()
    st.subheader("API Results Table")
    st.dataframe(df)
    
    if 'name' in df.columns and 'score' in df.columns:
        st.subheader("Score by Name")
        chart_data = df[["name", "score"]].set_index("name")
        st.bar_chart(chart_data)
    
    # Clean up old status messages
    if (
        "extract_status_msg" in st.session_state and
        "extract_status_time" in st.session_state and
        (time.time() - st.session_state["extract_status_time"]) >= 10
    ):
        st.session_state.pop("extract_status_msg", None)
        st.session_state.pop("extract_status_type", None)
        st.session_state.pop("extract_status_time", None) 