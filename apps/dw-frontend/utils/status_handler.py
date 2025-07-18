import streamlit as st
import time

def display_status_messages():
    """Display status messages in the sidebar if they exist and are recent."""
    if (
        "extract_status_msg" in st.session_state and
        "extract_status_type" in st.session_state and
        "extract_status_time" in st.session_state and
        (time.time() - st.session_state["extract_status_time"]) < 10
    ):
        msg = st.session_state["extract_status_msg"]
        typ = st.session_state["extract_status_type"]
        if typ == "success":
            st.success(msg)
        elif typ == "error":
            st.error(msg)
        elif typ == "warning":
            st.warning(msg)
        elif typ == "info":
            st.info(msg)

def cleanup_old_status_messages():
    """Clean up old status messages from session state."""
    if (
        "extract_status_msg" in st.session_state and
        "extract_status_time" in st.session_state and
        (time.time() - st.session_state["extract_status_time"]) >= 10
    ):
        st.session_state.pop("extract_status_msg", None)
        st.session_state.pop("extract_status_type", None)
        st.session_state.pop("extract_status_time", None) 