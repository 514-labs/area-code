import streamlit as st

# Import pages
from pages import overview, s3_view, datadog_view, analytics
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
    
    s3_page = st.Page(
        s3_view.show,
        title="S3",
        icon="📦",
        url_path="s3"
    )
    
    datadog_page = st.Page(
        datadog_view.show,
        title="Datadog",
        icon="📊",
        url_path="datadog"
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
        "Connectors": [overview_page, s3_page, datadog_page]
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
