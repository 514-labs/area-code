import streamlit as st
import streamlit_shadcn_ui as ui
import html

# Add tooltip CSS for faster appearance
def add_tooltip_css():
    """Add CSS to reduce tooltip delay and improve appearance."""
    st.markdown("""
    <style>
    /* Custom tooltip styling for faster appearance */
    [data-tooltip]:hover {
        position: relative;
    }

    [data-tooltip]:hover::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
        transition: opacity 0.1s ease-in-out;
        opacity: 1;
        pointer-events: none;
        margin-bottom: 4px;
    }

    [data-tooltip]:hover::before {
        content: '';
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-top-color: rgba(0, 0, 0, 0.8);
        z-index: 1000;
        transition: opacity 0.1s ease-in-out;
        opacity: 1;
        pointer-events: none;
        margin-bottom: 8px;
    }
    </style>
    """, unsafe_allow_html=True)

def icon_button_with_tooltip(icon, tooltip_text, key, size="sm", variant="ghost"):
    """
    Create an icon button with a tooltip.
    
    Args:
        icon (str): The icon to display (emoji or text)
        tooltip_text (str): The tooltip text to show on hover
        key (str): Unique key for the button
        size (str): Button size ("sm", "md", "lg")
        variant (str): Button variant ("ghost", "outline", "default", etc.)
    
    Returns:
        bool: True if button was clicked, False otherwise
    """
    # Create a container for the button and tooltip
    col1, col2 = st.columns([1, 20])
    
    with col1:
        clicked = ui.button(
            text=icon,
            key=f"{key}_btn",
            size=size,
            variant=variant
        )
    
    with col2:
        st.markdown(f"<div data-tooltip='{tooltip_text}' style='display: inline-block; margin-left: -10px;'>{icon}</div>", unsafe_allow_html=True)
    
    return clicked

def info_icon_with_tooltip(tooltip_text, key, size="sm"):
    """
    Create an information icon with a tooltip.
    
    Args:
        tooltip_text (str): The tooltip text to show on hover
        key (str): Unique key for the component
        size (str): Icon size ("sm", "md", "lg")
    
    Returns:
        None: This is a display-only component
    """
    # Use a simple info icon with tooltip
    st.markdown(
        f"<span data-tooltip='{tooltip_text}' style='cursor: help; font-size: 16px; margin-left: 8px;'>ℹ️</span>",
        unsafe_allow_html=True
    )

def title_with_info_icon(title_text, tooltip_text, key):
    """
    Create a title with an info icon inline.
    
    Args:
        title_text (str): The title text to display
        tooltip_text (str): The tooltip text for the info icon
        key (str): Unique key for the component
    
    Returns:
        None: This is a display-only component
    """
    # Use flexbox to place title and icon inline with minimal spacing
    st.markdown(
        f"<div style='display: flex; align-items: center; gap: 4px;'>"
        f"<h3 style='margin: 0;'>{html.escape(title_text)}</h3>"
        f"<button style='background: none; border: none; cursor: help; font-size: 16px; color: #0066cc; padding: 0; margin: 0;' "
        f"data-tooltip='{html.escape(tooltip_text)}'>&nbsp;&nbsp;ℹ️</button>"
        f"</div>",
        unsafe_allow_html=True
    )

def get_icon_button_config(icon_type):
    """
    Get predefined configurations for common icon buttons.
    
    Args:
        icon_type (str): Type of icon ("refresh", "info", "warning", "error", etc.)
    
    Returns:
        dict: Configuration with icon and tooltip
    """
    configs = {
        "refresh": {
            "icon": "🔄",
            "tooltip": "Refresh data"
        },
        "info": {
            "icon": "ℹ️",
            "tooltip": "Information"
        },
        "warning": {
            "icon": "⚠️",
            "tooltip": "Warning"
        },
        "error": {
            "icon": "❌",
            "tooltip": "Error"
        },
        "success": {
            "icon": "✅",
            "tooltip": "Success"
        },
        "download": {
            "icon": "📥",
            "tooltip": "Download"
        },
        "upload": {
            "icon": "📤",
            "tooltip": "Upload"
        },
        "settings": {
            "icon": "⚙️",
            "tooltip": "Settings"
        }
    }
    
    return configs.get(icon_type, {"icon": "❓", "tooltip": "Unknown"})

def title_with_button(title_text, button_text, button_key, button_size="sm", button_variant="default"):
    """
    Create a title with a button inline on the same line.
    
    Args:
        title_text (str): The title text to display
        button_text (str): The button text
        button_key (str): Unique key for the button
        button_size (str): Button size ("sm", "md", "lg")
        button_variant (str): Button variant ("default", "outline", "ghost", etc.)
    
    Returns:
        bool: True if button was clicked, False otherwise
    """
    # Add custom CSS to style Streamlit buttons like ShadCN
    st.markdown("""
        <style>
        /* Style Streamlit buttons to look like ShadCN buttons */
        .stButton > button {
            background-color: #000000 !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: 6px !important;
            padding: 8px 12px !important;
            font-size: 12px !important;
            font-weight: 500 !important;
            height: 32px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: background-color 0.2s !important;
            cursor: pointer !important;
            white-space: normal !important;
            word-wrap: break-word !important;
            min-width: fit-content !important;
            float: right !important;
            margin-left: auto !important;
        }
        .stButton > button:hover {
            background-color: #333333 !important;
        }
        </style>
    """, unsafe_allow_html=True)
    
    # Use columns to create a balanced layout with title on left and button on right
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.markdown(f"<h2 style='margin: 0; margin-bottom: 0.5rem;'>{html.escape(title_text)}</h2>", unsafe_allow_html=True)
    
    with col2:
        # Use CSS to right-align the button within the column
        st.markdown(
            f"<div style='text-align: right; width: 100%; margin-right: 20px;'>",
            unsafe_allow_html=True
        )
        
        # Use native Streamlit button with ShadCN-like styling
        result = st.button(
            label=button_text,
            key=button_key,
            help="",
            use_container_width=False
        )
        
        st.markdown("</div>", unsafe_allow_html=True)
        return result 