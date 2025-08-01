// Welcome to your new Moose analytical backend! 🦌

// Getting Started Guide:

// 1. Data Modeling
// First, plan your data structure and create your data models
// → See: docs.fiveonefour.com/moose/building/data-modeling
//   Learn about type definitions and data validation

// 2. Set Up Ingestion
// Create ingestion pipelines to receive your data via REST APIs
// → See: docs.fiveonefour.com/moose/building/ingestion
//   Learn about IngestPipeline, data formats, and validation

// 3. Create Workflows
// Build data processing pipelines to transform and analyze your data
// → See: docs.fiveonefour.com/moose/building/workflows
//   Learn about task scheduling and data processing

// 4. Configure Consumption APIs
// Set up queries and real-time analytics for your data
// → See: docs.fiveonefour.com/moose/building/consumption-apis

// Need help? Check out the quickstart guide:
// → docs.fiveonefour.com/moose/getting-started/quickstart

export * from "./pipelines/eventsPipeline";
export * from "./views/foo";
export * from "./apis/bar/consumption/bar-average-value";
export * from "./apis/bar/consumption/bar-base";
export * from "./apis/foo/consumption/foo-average-score";
export * from "./apis/foo/consumption/foo-base";
export * from "./apis/foo/consumption/foo-current-state";
export * from "./apis/foo/consumption/foo-score-over-time";
