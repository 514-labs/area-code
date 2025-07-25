# Walk-Through Tour

## Overview

The Data Warehouse Frontend is a Streamlit-based web application that provides business users and data analysts with an intuitive interface to interact with the Moose-powered analytical backend. It transforms complex data warehouse operations into simple, visual interactions that require no technical expertise. 

The application enables self-service analytics, real-time data exploration, operational visibility into data pipeline health, and decision-making support through automated data extraction and visualization. 

Key features include one-click data extraction from multiple sources (blob storage, application logs, user events), automated data processing with real-time status updates, centralized data management through a unified interface, and interactive dashboards for business insights.

> For a detailed overview of the frontend application's architecture and business value, see: [Data Warehouse Frontend Application Overview](./web-front-end.md)

In this walkthrough document, we'll step through each frontend page. Keep in mind that all pages are implemented using the following Moose framework features:

- **Data Models**: Pydantic `BaseModel` classes with `Key[str]` primary keys and proper type annotations
- **IngestPipeline**: Multiple pipelines (source + final) with ingest, stream, table, and DLQ configurations  
- **Stream Transformations**: Real-time data processing with `.add_transform()` and timestamp addition
- **ConsumptionApi**: Type-safe HTTP endpoints using ClickHouse native parameter binding
- **Workflow**: Temporal-powered workflows for pull-based data extraction with failure simulation
- **Dead Letter Queue**: Automatic error handling with DLQ recovery transforms

## Landing Page

When the Data Warehouse frontend launches, users see the Connector Analytics page displaying three data sources: Blob, Log, and Event. Initially empty, clicking "Refresh" triggers Moose workflows that extract data via connectors, process it through real-time streams with transformations, and store it in ClickHouse tables. The page then displays unified metrics and recent data from all three sources.

![landing page](./dw-images/dw-landing.png)

![landing page populated](./dw-images/dw-landing-2.png)

The Connector Analytics Report provides a unified dashboard view of all data sources. Three metric cards display real-time counts for Blob, Log, and Event connectors. The "Recent Data Summary" table shows the latest 10 records across all sources with key details like file names, sizes, and permissions for blobs. Users can trigger fresh data extraction by clicking the "Refresh" button, which populates the dashboard with current metrics and recent data from the warehouse.

## Navigation

Under the "Connectors" section we have links for All, Blobs, Logs and Events. All shows overview data for all connections and individual connector pages show specific information for each connector.

![navbar](./dw-images/navbar.png)

## Connector Pages

### What Are Connectors?

Connectors are mock data generators that simulate real-world data sources (blob storage, application logs, user events) for the data warehouse. They use a factory pattern to create domain-specific extractors that generate structured test data. In the data warehouse, Moose workflows use these connectors to extract data, which then flows through ingest pipelines for real-time processing and storage. Each connector produces Pydantic models that match the source data schemas, enabling type-safe data flow from extraction through transformation to final storage.

### All Page

The `All` connectors page displays a unified dashboard showing combined data from all three connectors. It features metric cards displaying real-time counts for Blob, Log, and Event data sources, plus a data table showing records across all sources. Users can trigger fresh data extraction for all connectors simultaneously using the "Pull via connectors" button, which populates the dashboard with current metrics and recent data from the warehouse.

![overview all page](./dw-images/overview.png)

The top filter dropdown allows users to filter the view by specific connector types: "All", "Blob", "Logs", or "Events". When "Events" is selected, additional event analytics metrics are displayed showing unique users, active sessions, and total events over the past 24 hours. The filter dynamically updates the data table to show only records from the selected connector type.

### Individual Connector Pages

Each connector page (Blobs, Logs, Events) follows a similar structure with four main sections:

1. **Summary Cards**: Metric cards displaying counts by relevant categories (file types for blobs, log levels for logs, event types for events). Each page has a "Pull via connectors" button that triggers the respective workflow.

2. **Data Table**: A comprehensive table showing individual records with formatted columns and relevant metadata for each data type.

3. **Workflows**: Shows recent workflow execution history with Run ID, Status, Start Time, Duration, and clickable "View Details" links that open the Temporal UI.

4. **Dead Letter Queue Testing**: Interactive controls for testing the DLQ system (covered in detail below).

**Behind the Scenes**: All pages use Moose's ConsumptionApi to query ClickHouse tables with built-in SQL injection protection through parameter binding. Workflow sections tap into MooseClient.workflows to show real-time Temporal execution history. The Events page additionally demonstrates MaterializedView capabilities with AggregatingMergeTree engine for pre-aggregated data.

#### Blobs Page

![blob page 1](./dw-images/blob-page-1.png)

The Blobs page shows file type counts (JSON, CSV, TXT) and displays individual blob records with columns for ID, File Name, Bucket, Content Type, Size (formatted in human-readable bytes/KB/MB), Permissions, and Full Path. The table displays various file types including PDFs, MP3s, TXT files, PNGs, and DOCs with their associated metadata.

#### Logs Page

![logs page](./dw-images/logs.png)

The Logs page shows log level counts (INFO, DEBUG, WARN, ERROR) and displays individual log records with columns for ID, Level, Source, Trace ID, Message Preview (truncated for readability), and Log Timestamp (formatted for better display).

#### Events Page

![events page](./dw-images/events.png)

The Events page shows event type counts (Pageview, Signup, Click, Purchase, Other) and includes a unique **Daily Page Views Trend** section demonstrating Moose's materialized view capabilities. This section shows aggregated page view data with metric cards (Today's Page Views, Today's Unique Visitors, Change from Yesterday), a line chart displaying page views over time, and a daily breakdown table using AggregatingMergeTree engine.

The Events Table includes filtering controls for Event Type and Project, displaying columns for Event Name, Timestamp, User ID, Session ID, Project ID, IP Address, and Processed On timestamp.

## Dead Letter Queue Testing

All connector pages include a Dead Letter Queue Testing section that provides interactive controls for testing the DLQ system. This section includes:

- **Batch Size Input**: Configurable number of records to process (default: 10)
- **Failure Percentage Input**: Configurable failure rate (default: 20%)
- **Trigger DLQ Button**: Simulates failures during processing
- **View Queues Button**: Opens the Kafdrop UI for queue inspection (will be replaced with new Moose features under development)

When DLQ messages are retrieved, they display in a filtered table showing partition, offset, error details, and record information. Users can select individual messages to view their complete JSON payload for debugging and recovery analysis.

![dlq](./dw-images/dlq.png)

The screenshot shows the DLQ testing interface in action. A green notification confirms successful DLQ triggering with batch size 10 and 20% failure rate. The "Dead Letter Queue Messages" table displays two failed events that were automatically routed to the DLQ, showing their partition/offset locations, error messages indicating transformation failures, timestamps, and unique record IDs. The system automatically filters messages by connector type (Events in this case) and tracks offset positions to avoid duplicate processing.

**Behind the Scenes**: The DLQ system leverages Moose's DLQ transforms and recovery mechanisms, using DeadLetterModel to handle failed records and enable message recovery. Failed messages are automatically routed to DLQs where they can be inspected, fixed, and reprocessed through recovery transforms.

## Summary

This walkthrough has demonstrated how the Data Warehouse Frontend provides business users with an intuitive interface to interact with complex analytical infrastructure. Through the lens of this application, we've explored how Moose framework transforms traditional data engineering challenges into simple, declarative code.

**What We've Covered:**
- A unified dashboard showing real-time metrics across multiple data sources
- Individual connector pages for detailed data exploration (Blobs, Logs, Events)
- Interactive workflow monitoring with direct links to Temporal UI
- Advanced error handling through Dead Letter Queue testing and recovery
- Materialized views demonstrating pre-aggregated analytics capabilities

**Moose's Role:**
Moose has been the invisible foundation that makes this all possible. It automatically provisions ClickHouse databases, Redpanda streaming platforms, and API gateways from simple Python declarations. The framework ensures end-to-end type safety, provides built-in SQL injection protection, enables real-time stream processing, and offers robust error handling—all while maintaining the developer experience of writing simple, declarative code.

The result is a working example of a data warehouse that business users can interact with confidently, knowing that the underlying infrastructure is reliable, scalable, and maintainable. This demonstrates Moose's core value: transforming complex analytical backends into accessible, business-friendly applications.