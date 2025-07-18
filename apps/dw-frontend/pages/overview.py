import streamlit as st
import time
import requests
import pandas as pd
import streamlit_shadcn_ui as ui

# Import shared functions
from utils.api_functions import fetch_data, trigger_both_extracts, handle_refresh_and_fetch

def show():
    st.title("Overview")
    
    if ui.button(text="Trigger Extracts", key="trigger_extracts_btn"):
        with st.spinner("Triggering S3 and Datadog extracts and waiting for backend to finish..."):
            trigger_both_extracts()
            time.sleep(2)
        st.session_state["refresh_data"] = True
    
    tags_options = ["All", "S3", "Datadog"]
    selected_tag = ui.select(options=tags_options, label="Filter by Tag", key="tag_select")
    df = handle_refresh_and_fetch("refresh_data", selected_tag)
    
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