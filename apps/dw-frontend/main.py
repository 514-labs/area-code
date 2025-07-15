import streamlit as st
import time
import requests
import pandas as pd
import random

# API base URL
API_BASE = "http://localhost:4200/consumption"

# Page config
st.set_page_config(
    page_title="Data Warehouse Front-end",
    page_icon="🚀",
    layout="wide"
)

# --- Add extract trigger buttons to sidebar ---

def get_page_from_query():
    # Use st.query_params (Streamlit 1.30.0+) instead of deprecated experimental API
    page = st.query_params.get("page", None)
    return page

def set_page_in_query(page):
    st.query_params["page"] = page

# List of valid pages
PAGES = ("All", "S3", "Datadog")
REPORTS = ("Connector analytics",)

# Combine main and reports for navigation
NAV_SECTIONS = [
    ("Reports", list(REPORTS)),
    ("Data Warehouse", list(PAGES)),
]

# Sidebar navigation with section headers
def sidebar_navigation():
    st.sidebar.markdown("## Menu")
    selected = None
    for section, items in NAV_SECTIONS:
        st.sidebar.markdown(f"#### {section}")
        for item in items:
            if st.sidebar.button(item, key=f"nav-{item}"):
                set_page_in_query(item)
                selected = item
    # Fallback to query param or default
    if not selected:
        selected = get_page_from_query() or REPORTS[0]  # Default to Connector analytics
    return selected

# Use new sidebar navigation
page = sidebar_navigation()
set_page_in_query(page)

def trigger_extract(api_url, label):
    batch_size = random.randint(10, 100)
    url = f"{api_url}/getBars?batch_size={batch_size}"
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

def fetch_data(tag):
    api_url = f"{API_BASE}/getBars?tag={tag}"
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])
        df = pd.DataFrame(items)
        if not df.empty and "transform_timestamp" in df.columns:
            # Convert to datetime and format nicely
            df["Processed On"] = pd.to_datetime(df["transform_timestamp"]).dt.strftime("%Y-%m-%d %H:%M:%S")
            # Insert as second column
            cols = list(df.columns)
            cols.insert(1, cols.pop(cols.index("Processed On")))
            df = df[cols]
            # Optionally drop the raw transform_timestamp column if not needed
            df = df.drop(columns=["transform_timestamp"])
        return df
    except Exception as e:
        st.error(f"Failed to fetch data from API: {e}")
        return pd.DataFrame()

if page == "All":
    # --- Add Trigger Extracts button (calls both APIs) ---
    def trigger_both_extracts():
        trigger_extract(f"{API_BASE}/extract-s3", "S3")
        trigger_extract(f"{API_BASE}/extract-datadog", "Datadog")

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
            trigger_extract(f"{API_BASE}/extract-s3", "S3")
            time.sleep(1.5)
            st.session_state["refresh_s3"] = True
    if st.session_state.get("refresh_s3", False):
        with st.spinner("Refreshing S3 data after extract..."):
            df = fetch_data("S3")
        st.session_state["refresh_s3"] = False
    else:
        df = fetch_data("S3")
    st.subheader("S3 Items Table")
    if not df.empty and "large_text" in df.columns:
        # Parse the large_text field into columns
        parsed = df["large_text"].str.split("|", n=3, expand=True)
        parsed.columns = ["Ingested On", "S3 Location", "Permissions", "Resource size"]
        # Remove leading/trailing whitespace from each column
        parsed = parsed.apply(lambda col: col.str.strip())
        # Insert Processed On as second column if present
        if "Processed On" in df.columns:
            parsed.insert(1, "Processed On", df["Processed On"])
        st.dataframe(parsed, use_container_width=True)
    else:
        st.write("No S3 log data available.")
elif page == "Datadog":
    if "refresh_datadog" not in st.session_state:
        st.session_state["refresh_datadog"] = False
    if st.button("Trigger Datadog Extract"):
        with st.spinner("Triggering Datadog extract and waiting for backend to finish..."):
            trigger_extract(f"{API_BASE}/extract-datadog", "Datadog")
            time.sleep(1.5)
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
        # Insert Processed On as second column if present
        if "Processed On" in df.columns:
            parsed_logs.insert(1, "Processed On", df["Processed On"])
        st.dataframe(parsed_logs, use_container_width=True)
    else:
        st.write("No Datadog log data available.")

elif page == "Connector analytics":
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
            Data Warehouse Front-end
        </div>
    """, unsafe_allow_html=True)
    st.title("Connector Analytics Report")
    # Add Update button to trigger both extracts
    if st.button("Update"):
        trigger_extract(f"{API_BASE}/extract-s3", "S3")
        trigger_extract(f"{API_BASE}/extract-datadog", "Datadog")
    # Fetch all data (no tag filter)
    df = fetch_data("All")
    if df.empty:
        st.warning("No data available for analytics.")
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
        st.subheader("Connector Entry Breakdown")
        st.table(breakdown)
        # --- Items per minute chart ---
        if "Processed On" in df.columns:
            df["Processed On (minute)"] = pd.to_datetime(df["Processed On"], errors="coerce").dt.floor("T")
            per_min = df.groupby(["Processed On (minute)", "Source"]).size().reset_index(name="Count")
            per_min_pivot = per_min.pivot(index="Processed On (minute)", columns="Source", values="Count").fillna(0)
            per_min_pivot = per_min_pivot.sort_index()
            st.subheader("Total Items Per Minute by Connector")
            st.bar_chart(per_min_pivot)
        else:
            st.info("No timestamp data available for per-minute chart.")

# Footer
st.markdown("---")
st.markdown("""
<div style='text-align: center'>
                <span style='font-size:.8rem;'>Made with MOOSE</span><br>
    <span style='font-size:.8rem;'><a href="https://docs.fiveonefour.com/moose" style="color:#4FC3F7;" target="_blank">Learn More: docs.fiveonefour.com/moose</a></span>
</div>
""", unsafe_allow_html=True)

# Removed time.sleep(1) and st.rerun() to avoid infinite reruns
