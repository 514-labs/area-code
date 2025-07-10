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

# Modern animated banner
st.markdown("""
    <style>
        .modern-banner {
            background: black; /* linear-gradient(135deg, #7f00ff, #e100ff); */
            color: white;
            padding: 2rem;
            text-align: center;
            font-size: 1.7rem;
            font-weight: 600;
            font-family: 'Segoe UI', sans-serif;
            border-radius: 15px;
            /* box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25); */
            animation: slideFadeIn 0.8s ease-out, pulse 2.5s ease-in-out infinite;
            margin-bottom: 2rem;
        }

        @keyframes slideFadeIn {
            0% {
                transform: translateY(-20px);
                opacity: 0;
            }
            100% {
                transform: translateY(0);
                opacity: 1;
            }
        }

        @keyframes pulse {
            0% {
                box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
            }
            50% {
                box-shadow: 0 0 28px rgba(255, 255, 255, 0.45);
            }
            100% {
                box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
            }
        }
    </style>

    <div class="modern-banner">
        Data Warehouse Front-end<br>
        \n Made with ❤️ MOOSE\n 
            Learn More: docs.fiveonefour.com/moose
    </div>
""", unsafe_allow_html=True)

# Fetch and display API data as a table
api_url = "http://localhost:4001/getFoos"
try:
    response = requests.get(api_url)
    response.raise_for_status()
    data = response.json()
    items = data.get("items", [])
    if items:
        df = pd.DataFrame(items)
        st.subheader("API Results Table")
        st.dataframe(df)

        # Graph panel: Bar chart of name vs score
        if 'name' in df.columns and 'score' in df.columns:
            st.subheader("Score by Name")
            chart_data = df[["name", "score"]].set_index("name")
            st.bar_chart(chart_data)
    else:
        st.info("No items found in API response.")
except Exception as e:
    st.error(f"Failed to fetch data from API: {e}")

# Footer
st.markdown("---")
st.markdown("""
<div style='text-align: center'>
    Built with Streamlit | Data Warehouse Front-end
</div>
""", unsafe_allow_html=True)

# Removed time.sleep(1) and st.rerun() to avoid infinite reruns
