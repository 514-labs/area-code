import streamlit as st

# Import pages
from pages import overview, blob_view, logs_view, events_view, analytics
from utils.status_handler import display_status_messages, cleanup_old_status_messages

# Page config
st.set_page_config(
    page_title="Data Warehouse Front-end",
    page_icon="🚀",
    layout="wide"
)

def set_sidebar_min_width():
    st.markdown(
        """
        <style>
        section[data-testid="stSidebar"] {
            min-width: 200px !important;
            max-width: 200px !important;
            width: 200px !important;
        }
        section[data-testid="stSidebar"] .block-container {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

# Apply sidebar styling
set_sidebar_min_width()

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
        blob_view.show,
        title="Blob",
        icon="📦",
        url_path="blob"
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
        icon="📈",
        url_path="events"
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
        "Connectors": [overview_page, blob_page, logs_page, events_page]
    })
    
    return nav

# Create and run navigation
nav = create_navigation()

# Run the navigation (this will render the navigation menu in the sidebar)
nav.run()

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
