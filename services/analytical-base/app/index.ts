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

import { Foo } from "@workspace/models/foo";
import { Bar } from "@workspace/models/bar";
import { IngestPipeline, Key } from "@514labs/moose-lib";

interface CDC {
  cdc_id: Key<string>;
  cdc_operation: "INSERT" | "UPDATE" | "DELETE";
  cdc_timestamp: Date;
}

export const FooPipeline = new IngestPipeline<Foo & CDC>("Foo", {
  table: true,
  stream: true,
  ingest: true,
});
export const BarPipeline = new IngestPipeline<Bar & CDC>("Bar", {
  table: true,
  stream: true,
  ingest: true,
});

 

export * from "./pipelines/eventsPipeline";
export * from "./apis/FooConsumptionApi";
export * from "./apis/BarConsumptionApi";
