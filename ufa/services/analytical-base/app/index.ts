// Welcome to your new Moose analytical backend! 🦌
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

import { Stream, IngestPipeline} from "@514labs/moose-lib"; // Moose library for building analytical pipelines
import { FooWithCDC, BarWithCDC } from "@workspace/models"; // Models for the CDC tables
import { SqlServerDebeziumPayload } from "./models/debeziumPayload"; // Interface for the CDC Debezium payload
import { transformDebeziumPayloadToFooWithCDC, transformDebeziumPayloadToBarWithCDC } from "./functions/sqlServerDebeziumTransform"; // Functions to transform the CDC Debezium payload to the models


// CDC TABLES

// 1. Pipeline objects in Moose to process and store CDC Debezium payloads from source tables 
export const FooPipeline = new IngestPipeline<FooWithCDC>("Foo", {
  table: {
    orderByFields: ["cdc_id", "cdc_timestamp"],
    deduplicate: true,
  },
  stream: true, 
  ingest: false,
});

export const BarPipeline = new IngestPipeline<BarWithCDC>("Bar", {
  table: {
    orderByFields: ["cdc_id", "cdc_timestamp"],
    deduplicate: true,
  },
  stream: true,
  ingest: false,
});


// Stream Processing to transform CDC Debezium payloads to CDC tables

// 1. Create the topic for the Debezium connector to write to
export const sqlServerDebeziumPayloadStream = new Stream<SqlServerDebeziumPayload>("SqlServerDebeziumPayloadRedpandaTopic", {});

// 2. Connect stream processing function to transform CDC Debezium payload to FooWithCDC
sqlServerDebeziumPayloadStream.addTransform(FooPipeline.stream!, transformDebeziumPayloadToFooWithCDC);

// 3. Connect stream processing function to transform CDC Debezium payload to BarWithCDC
sqlServerDebeziumPayloadStream.addTransform(BarPipeline.stream!, transformDebeziumPayloadToBarWithCDC);


// 5. Expose APIs built on top of the CDC tables for blazing fast analytics
export * from "./apis/bar/consumption/bar-average-value";
export * from "./apis/bar/consumption/bar-base";
export * from "./apis/foo/consumption/foo-average-score";
export * from "./apis/foo/consumption/foo-base";
export * from "./apis/foo/consumption/foo-current-state";
export * from "./apis/foo/consumption/foo-score-over-time";