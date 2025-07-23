import streamlit as st
import time
import pandas as pd
import streamlit_shadcn_ui as ui

# Import shared functions
from utils.api_functions import (
    fetch_events_data, fetch_event_analytics, trigger_extract, 
    render_dlq_controls, render_workflows_table, fetch_daily_pageviews_data
)
from utils.constants import CONSUMPTION_API_BASE

def show():
    # Fetch analytics data for metrics
    analytics = fetch_event_analytics(hours=24)
    event_counts = {"pageview": 0, "signup": 0, "click": 0, "purchase": 0, "other": 0}

    col1, col2 = st.columns([5, 1])
    with col1:
        st.markdown("<h2 style='margin: 0; line-height: 1;'>Events View</h2>", unsafe_allow_html=True)
    with col2:
        # Use empty space to push button to the right
        st.markdown("<div style='margin-top: 12px;'></div>", unsafe_allow_html=True)
        # Create three sub-columns to push the button to the right
        _, _, button_col = st.columns([1, 1, 1])
        with button_col:
            if ui.button(text="Extract", key="trigger_events_btn", size="sm"):
                with st.spinner(""):
                    trigger_extract(f"{CONSUMPTION_API_BASE}/extract-events", "Events")
                    time.sleep(2)
                st.session_state["refresh_events"] = True
                st.rerun()
    
    # Fetch events data using new structured API
    if st.session_state.get("refresh_events", False):
        st.session_state["refresh_events"] = False

    # Use analytics data for event counts
    if analytics and "event_counts" in analytics:
        for item in analytics["event_counts"]:
            event_name = item["event_name"]
            count = item["count"]
            if event_name in event_counts:
                event_counts[event_name] = count
            else:
                event_counts["other"] += count

    # Metric cards
    cols = st.columns(len(event_counts))
    for idx, (event_type, count) in enumerate(event_counts.items()):
        with cols[idx]:
            ui.metric_card(
                title=event_type.title(),
                content=str(count),
                key=f"events_metric_{event_type}"
            )

    # Daily Page Views Materialized View Section
    st.subheader("📈 Daily Page Views Trend (Materialized View Demo)")
    
    # Fetch daily page views data
    pageviews_df = fetch_daily_pageviews_data(days_back=14, limit=14)
    
    if not pageviews_df.empty:
        # Create metrics for today vs yesterday comparison
        today = pageviews_df.iloc[-1] if len(pageviews_df) > 0 else None
        yesterday = pageviews_df.iloc[-2] if len(pageviews_df) > 1 else None
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if today is not None:
                ui.metric_card(
                    title="Today's Page Views",
                    content=str(today['total_pageviews']),
                    key="today_pageviews"
                )
        
        with col2:
            if today is not None:
                ui.metric_card(
                    title="Today's Unique Visitors", 
                    content=str(today['unique_visitors']),
                    key="today_visitors"
                )
        
        with col3:
            if today is not None and yesterday is not None:
                change = today['total_pageviews'] - yesterday['total_pageviews']
                change_pct = (change / yesterday['total_pageviews'] * 100) if yesterday['total_pageviews'] > 0 else 0
                change_text = f"+{change}" if change >= 0 else str(change)
                ui.metric_card(
                    title="Change from Yesterday",
                    content=f"{change_text} ({change_pct:+.1f}%)",
                    key="pageviews_change"
                )
        
        # Simple line chart
        st.subheader("📊 Page Views Over Time")
        chart_df = pageviews_df.copy()
        chart_df['Date'] = chart_df['view_date'].dt.strftime('%m/%d')
        
        st.line_chart(
            chart_df.set_index('Date')[['total_pageviews', 'unique_visitors']],
            height=300
        )
        
        # Data table
        st.subheader("📋 Daily Breakdown")
        display_df = pageviews_df.copy()
        display_df['view_date'] = display_df['view_date'].dt.strftime('%Y-%m-%d')
        display_df.columns = ['Date', 'Total Page Views', 'Unique Visitors']
        st.dataframe(display_df, use_container_width=True)
        
        # Educational note
        st.info("💡 **Materialized View Demo**: This data is pre-aggregated using Moose's materialized views with AggregatingMergeTree engine. The aggregation updates automatically as new pageview events are ingested, providing fast query performance.")
        
    else:
        st.info("📊 No daily page views data available yet. Generate some pageview events using the Extract button to see this materialized view in action!")

    # Show workflow runs
    render_workflows_table("events-workflow", "Events")
    
    st.subheader("Events Table")
    
    # Add filtering controls just above the table
    col1, col2, col3 = st.columns(3)
    with col1:
        event_filter = st.selectbox("Filter by Event Type", ["All", "pageview", "signup", "click", "purchase", "login"])
    with col2:
        project_filter = st.selectbox("Filter by Project", ["All", "proj_web", "proj_mobile", "proj_api", "proj_admin"])
    
    # Fetch filtered data
    df = fetch_events_data(
        event_name=event_filter if event_filter != "All" else None,
        project_id=project_filter if project_filter != "All" else None,
        limit=500
    )
    
    # Prepare display data
    display_df = None
    if not df.empty:
        # Select and rename columns for better display
        display_columns = ["event_name", "timestamp", "distinct_id", "session_id", 
                          "project_id", "ip_address"]
        if "transform_timestamp" in df.columns:
            display_columns.append("transform_timestamp")
            
        display_df = df[display_columns].copy()
        display_df.columns = ["Event Name", "Timestamp", "User ID", "Session ID", 
                             "Project ID", "IP Address"] + (["Processed On"] if "transform_timestamp" in df.columns else [])

    if display_df is not None and not display_df.empty:
        st.dataframe(display_df, use_container_width=True)
    else:
        st.write("No events data available.")
    
    # Use the reusable DLQ controls function
    render_dlq_controls("extract-events", "refresh_events")
    
    # Always check for and display existing DLQ data
    dlq_messages_key = "dlq_messages_extract-events"
    if dlq_messages_key in st.session_state and st.session_state[dlq_messages_key]:
        filter_tag = "Events"
        st.subheader(f"Dead Letter Queue Messages (Filtered for {filter_tag})")
        st.markdown("**These entries have been auto resolved.**")

        # Status line showing count of retrieved items and offset tracking
        item_count = len(st.session_state[dlq_messages_key])
        highest_offset_key = "dlq_highest_offset_extract-events"
        current_highest_offset = st.session_state.get(highest_offset_key, -1)
        st.info(f"📊 Retrieved {item_count} new DLQ message{'s' if item_count != 1 else ''} matching {filter_tag} filter (showing messages after offset {current_highest_offset})")
        
        # Create and display DataFrame at full width
        df_dlq = pd.DataFrame(st.session_state[dlq_messages_key])
        
        # Add selection capability to the dataframe
        selected_rows = st.dataframe(
            df_dlq, 
            use_container_width=True, 
            height=400,
            on_select="rerun",
            selection_mode="single-row"
        )
        
        # Display JSON for selected row
        if selected_rows.selection.rows:
            selected_idx = selected_rows.selection.rows[0]
            if selected_idx < len(st.session_state[dlq_messages_key]):
                st.subheader(f"JSON Details for Message #{selected_idx + 1}")
                
                # Get the original parsed message from session state
                raw_messages_key = "dlq_raw_messages_extract-events"
                if raw_messages_key in st.session_state and selected_idx < len(st.session_state[raw_messages_key]):
                    original_json = st.session_state[raw_messages_key][selected_idx]
                    st.json(original_json)
                else:
                    st.error("Original JSON data not available for this message.") 