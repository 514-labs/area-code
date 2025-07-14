import streamlit as st
import time
import requests
import pandas as pd
import random

# Page config
st.set_page_config(
    page_title="Data Warehouse Front-end",
    page_icon="🚀",
    layout="wide"
)

# Sidebar navigation
page = st.sidebar.radio(
    "Data Warehouse",
    ("All", "S3", "Datadog"),
    index=0
)

# --- Add extract trigger buttons to sidebar ---
def trigger_extract(api_url, label):
    batch_size = random.randint(10, 100)
    url = f"{api_url}?batch_size={batch_size}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        st.session_state["extract_status_msg"] = f"{label} extract triggered with batch size {batch_size}."
        st.session_state["extract_status_type"] = "success"
        st.session_state["extract_status_time"] = time.time()
    except Exception as e:
        st.session_state["extract_status_msg"] = f"Failed to trigger {label} extract (batch size {batch_size}): {e}"
        st.session_state["extract_status_type"] = "error"
        st.session_state["extract_status_time"] = time.time()

# API base URL
API_BASE = "http://localhost:4001/getFoos"

def fetch_data(tag):
    api_url = f"{API_BASE}?tag={tag}"
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])
        df = pd.DataFrame(items)
        return df
    except Exception as e:
        st.error(f"Failed to fetch data from API: {e}")
        return pd.DataFrame()

if page == "All":
    # Modern animated banner
    st.markdown("""
        <style>
            .modern-banner {
                background: black;
                color: white;
                padding: 2rem;
                text-align: center;
                font-size: 1.7rem;
                font-weight: 600;
                font-family: 'Segoe UI', sans-serif;
                border-radius: 15px;
                animation: slideFadeIn 0.8s ease-out, pulse 2.5s ease-in-out infinite;
                margin-bottom: 2rem;
            }
            @keyframes slideFadeIn {
                0% { transform: translateY(-20px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
            @keyframes pulse {
                0% { box-shadow: 0 0 12px rgba(255, 255, 255, 0.2); }
                50% { box-shadow: 0 0 28px rgba(255, 255, 255, 0.45); }
                100% { box-shadow: 0 0 12px rgba(255, 255, 255, 0.2); }
            }
        </style>
        <div class="modern-banner">
            Data Warehouse Front-end<br>
            <span style='font-size:1.2rem;'>Made with ❤️ MOOSE</span><br>
            <span style='font-size:.8rem;'><a href="https://docs.fiveonefour.com/moose" style="color:#4FC3F7;" target="_blank">Learn More: docs.fiveonefour.com/moose</a></span>
        </div>
    """, unsafe_allow_html=True)

    # --- Add Trigger Extracts button (calls both APIs) ---
    def trigger_both_extracts():
        trigger_extract("http://localhost:4000/consumption/extract-s3", "S3")
        trigger_extract("http://localhost:4000/consumption/extract-datadog", "Datadog")

    if "refresh_data" not in st.session_state:
        st.session_state["refresh_data"] = False

    if st.button("Trigger Extracts"):
        trigger_both_extracts()
        st.session_state["refresh_data"] = True

    # Tag filter dropdown
    tags_options = ["All", "S3", "Datadog"]
    selected_tag = st.selectbox("Filter by Tag", tags_options, index=0)

    # If refresh_data is set, re-fetch the data
    if st.session_state.get("refresh_data", False):
        with st.spinner("Refreshing data after extract triggers..."):
            df = fetch_data(selected_tag)
        st.session_state["refresh_data"] = False
    else:
        df = fetch_data(selected_tag)

    st.subheader("API Results Table")
    st.dataframe(df)
    # Graph panel: Bar chart of name vs score
    if 'name' in df.columns and 'score' in df.columns:
        st.subheader("Score by Name")
        chart_data = df[["name", "score"]].set_index("name")
        st.bar_chart(chart_data)

    # Show sidebar status message if present and not expired
    if (
        "extract_status_msg" in st.session_state and
        "extract_status_time" in st.session_state and
        (time.time() - st.session_state["extract_status_time"]) < 10
    ):
        if st.session_state.get("extract_status_type") == "success":
            st.sidebar.success(st.session_state["extract_status_msg"])
        else:
            st.sidebar.error(st.session_state["extract_status_msg"])
    else:
        st.session_state.pop("extract_status_msg", None)
        st.session_state.pop("extract_status_type", None)
        st.session_state.pop("extract_status_time", None)

elif page == "S3":
    if "refresh_s3" not in st.session_state:
        st.session_state["refresh_s3"] = False
    if st.button("Trigger S3 Extract"):
        with st.spinner("Triggering S3 extract and waiting for backend to finish..."):
            trigger_extract("http://localhost:4000/consumption/extract-s3", "S3")
            time.sleep(5)
            st.session_state["refresh_s3"] = True
    if st.session_state.get("refresh_s3", False):
        with st.spinner("Refreshing S3 data after extract..."):
            df = fetch_data("S3")
        st.session_state["refresh_s3"] = False
    else:
        df = fetch_data("S3")
    st.subheader("S3 Items Table")
    st.dataframe(df)
elif page == "Datadog":
    if "refresh_datadog" not in st.session_state:
        st.session_state["refresh_datadog"] = False
    if st.button("Trigger Datadog Extract"):
        with st.spinner("Triggering Datadog extract and waiting for backend to finish..."):
            trigger_extract("http://localhost:4000/consumption/extract-datadog", "Datadog")
            time.sleep(5)
            st.session_state["refresh_datadog"] = True
    if st.session_state.get("refresh_datadog", False):
        with st.spinner("Refreshing Datadog data after extract..."):
            df = fetch_data("Datadog")
        st.session_state["refresh_datadog"] = False
    else:
        df = fetch_data("Datadog")
    st.subheader("Datadog Items Table")
    if not df.empty:
        # Assume the log data is in the last column
        log_col = df.columns[-1]
        # Split the log field into Level, Timestamp, Message
        parsed_logs = df[log_col].str.split("|", n=2, expand=True)
        parsed_logs.columns = ["Level", "Timestamp", "Message"]
        st.dataframe(parsed_logs, use_container_width=True)
    else:
        st.write("No Datadog log data available.")

# Footer
st.markdown("---")
st.markdown("""
<div style='text-align: center'>
    Built with Streamlit | Data Warehouse Front-end
</div>
""", unsafe_allow_html=True)

# Removed time.sleep(1) and st.rerun() to avoid infinite reruns
