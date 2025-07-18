import streamlit as st
import time
import requests
import pandas as pd
import streamlit_shadcn_ui as ui

# Import shared functions
from utils.api_functions import fetch_data, trigger_both_extracts, handle_refresh_and_fetch

def show():
    col1, col2 = st.columns([5, 1])
    with col1:
        st.markdown("<h2 style='margin: 0; line-height: 1;'>Overview</h2>", unsafe_allow_html=True)
    with col2:
        # Use empty space to push button to the right
        st.markdown("<div style='margin-top: 12px;'></div>", unsafe_allow_html=True)
        # Create three sub-columns to push the button to the right
        _, _, button_col = st.columns([1, 1, 1])
        with button_col:
            if ui.button(text="Extract", key="trigger_extracts_btn", size="sm"):
                with st.spinner(""):
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