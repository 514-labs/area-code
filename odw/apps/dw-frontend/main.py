import streamlit as st
import logging

# Disable HTTP access logs
logging.getLogger('tornado.access').disabled = True
logging.getLogger('streamlit').setLevel(logging.ERROR)

# Import pages
from pages import overview, blobs_view, logs_view, events_view, analytics, unstructured_data_view
from utils.status_handler import display_status_messages, cleanup_old_status_messages
from utils.tooltip_utils import add_tooltip_css

# Page config
st.set_page_config(
    page_title="Data Warehouse Front-end",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)



def set_sidebar_min_width():
    st.markdown(
        """
        <style>
        /* Aggressive top spacing reduction */
        .block-container {
            padding-top: 0.5rem !important;
            padding-bottom: 1rem !important;
            margin-top: 0rem !important;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

# Apply sidebar styling
set_sidebar_min_width()

# Apply tooltip CSS for faster appearance
add_tooltip_css()

# Add CSS to hide specific elements while preserving navigation


# Define navigation pages
def create_navigation():
    # Define page objects for st.navigation with explicit URL paths
    overview_page = st.Page(
        overview.show,
        title="All",
        icon="🏠",
        url_path="overview"
    )
    
    blob_page = st.Page(
        blobs_view.show,
        title="Blobs",
        icon="📦",
        url_path="blobs"
    )
    
    logs_page = st.Page(
        logs_view.show,
        title="Logs",
        icon="📊",
        url_path="logs"
    )
    
    events_page = st.Page(
        events_view.show,
        title="Events",
        icon="📢",
        url_path="events"
    )
    
    unstructured_data_page = st.Page(
        unstructured_data_view.show,
        title="Unstructured",
        icon="📄",
        url_path="unstructured-data",
        default=False
    )
    
    analytics_page = st.Page(
        analytics.show,
        title="Connector Analytics",
        icon="📈",
        url_path="analytics",
        default=True
    )
    
    # Create navigation with grouped sections
    nav = st.navigation({
        "Data Warehouse": [analytics_page],
        "Connectors": [overview_page, blob_page, logs_page, events_page, unstructured_data_page]
    })
    
    return nav

# Create and run navigation
nav = create_navigation()

# Run the navigation (this will render the navigation menu in the sidebar)
try:
    nav.run()
except Exception as e:
    st.error(f"Navigation error: {e}")
    st.info("Please try refreshing the page or navigating to a different section.")

# Display status messages at the bottom of the sidebar
with st.sidebar:
    display_status_messages()

# Clean up old status messages
cleanup_old_status_messages()

# Footer
st.markdown("---")
st.markdown("""
<div style='text-align: center'>
    <span style='font-size:.8rem;'>Made with MOOSE</span><br>
    <span style='font-size:.8rem;'><a href="https://docs.fiveonefour.com/moose" style="color:#4FC3F7;" target="_blank">Learn More: docs.fiveonefour.com/moose</a></span>
</div>
""", unsafe_allow_html=True)
