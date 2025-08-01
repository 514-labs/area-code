import streamlit as st

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
        section[data-testid="stSidebar"] {
            min-width: 200px !important;
            max-width: 200px !important;
            width: 200px !important;
        }
        section[data-testid="stSidebar"] .block-container {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }
        /* Hide the deploy button */
        .stAppDeployButton,
        [data-testid="stAppDeployButton"] {
            display: none !important;
        }

        /* Aggressive top spacing reduction */
        .block-container {
            padding-top: 0rem !important;
            padding-bottom: 1rem !important;
            margin-top: 0rem !important;
        }
        
        /* Remove default Streamlit header spacing */
        .stApp > header {
            height: 0rem !important;
            background: transparent !important;
            display: none !important;
        }
        
        /* Target main content area directly */
        .main {
            padding-top: 0rem !important;
            margin-top: 0rem !important;
        }
        
        /* Remove spacing from app container */
        .stApp {
            padding-top: 0rem !important;
            margin-top: 0rem !important;
        }
        
        /* Target specific content containers */
        div[data-testid="stAppViewContainer"] {
            padding-top: 0rem !important;
            margin-top: 0rem !important;
        }
        
        div[data-testid="stAppViewContainer"] > .main {
            padding-top: 0rem !important;
            margin-top: 0rem !important;
        }
        
        /* Remove toolbar spacing if present */
        div[data-testid="stToolbar"] {
            display: none !important;
        }
        
        /* Remove any top spacing from first elements */
        .element-container:first-child {
            margin-top: 0rem !important;
            padding-top: 0rem !important;
        }

        </style>
        """,
        unsafe_allow_html=True,
    )

# Apply sidebar styling
set_sidebar_min_width()

# Apply tooltip CSS for faster appearance
add_tooltip_css()

# Add CSS to hide permalink icons and style View Queues button
st.markdown("""
<style>
[data-testid="stHeaderActionElements"] {
    display: none;
}

/* Comprehensive styling for View Queues button hover state */
/* Target all possible Streamlit button variations */
.stButton > button:hover,
.stButton > a:hover,
.stButton button:hover,
.stButton a:hover {
    background-color: #F5F5F5 !important;
    color: #000000 !important;
    border-color: #000000 !important;
}

/* Specific targeting for secondary buttons */
.stButton > button[kind="secondary"]:hover,
.stButton > button[data-testid="baseButton-secondary"]:hover,
.stButton > a[data-testid="baseButton-secondary"]:hover {
    background-color: #F5F5F5 !important;
    color: #000000 !important;
    border-color: #000000 !important;
}

/* Target link buttons specifically */
.stButton a[href*="localhost:9999"]:hover,
.stButton a[href*="9999"]:hover {
    background-color: #F5F5F5 !important;
    color: #000000 !important;
    border-color: #000000 !important;
}

/* Additional selectors for Streamlit's button structure */
div[data-testid="stButton"] > button:hover,
div[data-testid="stButton"] > a:hover {
    background-color: #F5F5F5 !important;
    color: #000000 !important;
    border-color: #000000 !important;
}

/* Target buttons with specific text content */
.stButton button:contains("View Queues"):hover,
.stButton a:contains("View Queues"):hover {
    background-color: #F5F5F5 !important;
    color: #000000 !important;
    border-color: #000000 !important;
}

/* More specific selectors for Streamlit link buttons */
.stButton a[target="_blank"]:hover,
.stButton a[rel="noopener"]:hover {
    background-color: #F5F5F5 !important;
    color: #000000 !important;
    border-color: #000000 !important;
}

/* Target all buttons in the DLQ section */
.stButton:has(a[href*="9999"]) a:hover,
.stButton:has(button:contains("View Queues")) button:hover {
    background-color: #F5F5F5 !important;
    color: #000000 !important;
    border-color: #000000 !important;
}

/* Universal button hover override */
button:hover, a:hover {
    background-color: #F5F5F5 !important;
    color: #000000 !important;
    border-color: #000000 !important;
}

/* Number input control styling for DLQ section */
/* Target the plus and minus buttons in number inputs */
.stNumberInput > div > button:hover,
.stNumberInput button:hover,
[data-testid="stNumberInput"] > div > button:hover,
[data-testid="stNumberInput"] button:hover {
    background-color: #000000 !important;
    color: #FFFFFF !important;
    border-color: #000000 !important;
}

/* More specific targeting for number input controls */
.stNumberInput > div > div > button:hover,
.stNumberInput > div > div > div > button:hover {
    background-color: #000000 !important;
    color: #FFFFFF !important;
    border-color: #000000 !important;
}

/* Target the increment/decrement buttons specifically */
.stNumberInput button[aria-label*="increment"]:hover,
.stNumberInput button[aria-label*="decrement"]:hover,
.stNumberInput button[aria-label*="Increment"]:hover,
.stNumberInput button[aria-label*="Decrement"]:hover {
    background-color: #000000 !important;
    color: #FFFFFF !important;
    border-color: #000000 !important;
}


</style>
""", unsafe_allow_html=True)

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
