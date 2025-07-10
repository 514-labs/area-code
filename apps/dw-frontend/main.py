import streamlit as st
import time
import requests
import pandas as pd

# Page config
st.set_page_config(
    page_title="Data Warehouse Front-end",
    page_icon="🚀",
    layout="wide"
)

# Sidebar navigation
page = st.sidebar.radio(
    "Navigation",
    ("All", "S3", "Datadog"),
    index=0
)

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
    # Tag filter dropdown
    tags_options = ["All", "S3", "Datadog"]
    selected_tag = st.selectbox("Filter by Tag", tags_options, index=0)
    df = fetch_data(selected_tag)
    st.subheader("API Results Table")
    st.dataframe(df)
    # Graph panel: Bar chart of name vs score
    if 'name' in df.columns and 'score' in df.columns:
        st.subheader("Score by Name")
        chart_data = df[["name", "score"]].set_index("name")
        st.bar_chart(chart_data)
elif page == "S3":
    df = fetch_data("S3")
    st.subheader("S3 Items Table")
    st.dataframe(df)
elif page == "Datadog":
    df = fetch_data("Datadog")
    st.subheader("Datadog Items Table")
    st.dataframe(df)

# Footer
st.markdown("---")
st.markdown("""
<div style='text-align: center'>
    Built with Streamlit | Data Warehouse Front-end
</div>
""", unsafe_allow_html=True)

# Removed time.sleep(1) and st.rerun() to avoid infinite reruns
