# Data Warehouse Front-end

![dw-logo.png](../../services/data-warehouse/dw-logo.png)

## Overview

The Data Warehouse Front-end is a Streamlit-based web application for interacting with and visualizing data from backend data warehouse services. It provides a user-friendly interface to:
- Trigger data extraction jobs from sources like S3 and Datadog
- View and filter ingested data
- Monitor extraction status and analytics
- Visualize data trends and breakdowns

## Features
- **Trigger Extracts:** Start S3 and Datadog data extraction jobs with a single click.
- **Data Views:** Browse and filter ingested data by source (All, S3, Datadog).
- **Analytics:** See connector analytics, including breakdowns and per-minute item charts.
- **Status Feedback:** Real-time feedback on extraction status in the sidebar.

## How It Works
- The app communicates with backend APIs (default: `http://localhost:4200/consumption`) to fetch and trigger data operations.
- Extraction jobs are triggered via API calls, and the UI provides feedback and visualizations based on the results.
- Uses [streamlit-shadcn-ui](https://github.com/streamlit/streamlit-shadcn-ui) for enhanced UI components.

## Setup & Running

See: [../../services/data-warehouse/README.md](../../services/data-warehouse/README.md)

## Usage
- Use the sidebar to navigate between reports and data views.
- Click extract buttons to trigger backend jobs and refresh data.
- View tables and charts for insights into your data warehouse activity.

## Requirements
- Python 3.12+
- Streamlit
- Backend data warehouse APIs running and accessible: See: [../../services/data-warehouse/README.md](../../services/data-warehouse/README.md)

## Learn More
- [Moose Documentation](https://docs.fiveonefour.com/moose)


