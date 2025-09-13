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

export * from "./apis/bar/bar-average-value-api";
export * from "./apis/bar/bar-base-api";
export * from "./apis/foo/foo-base-api";
export * from "./apis/foo/foo-average-score";
export * from "./apis/foo/foo-score-over-time-api";
export * from "./apis/foo/foo-cube-aggregations-api";
export * from "./apis/foo/foo-filters-values-api";

// Import externalModels for its side effects: registers additional data models required for pipeline and API setup.
import "./externalModels";

import {
  IngestPipeline,
  OlapTable,
  Key,
  ClickHouseInt,
  ClickHouseDecimal,
  ClickHousePrecision,
  ClickHouseByteSize,
  ClickHouseNamedTuple,
  ClickHouseEngines,
  ClickHouseDefault,
  WithDefault,
  LifeCycle,
} from "@514labs/moose-lib";
import typia from "typia";

export interface dish {
  id: number & ClickHouseInt<"uint32">;
  name: string;
  description: string;
  menus_appeared: number & ClickHouseInt<"uint32">;
  times_appeared: number & ClickHouseInt<"int32">;
  first_appeared: number & ClickHouseInt<"uint16">;
  last_appeared: number & ClickHouseInt<"uint16">;
  lowest_price: string & ClickHouseDecimal<18, 3>;
  highest_price: string & ClickHouseDecimal<18, 3>;
}

export const DishTable = new OlapTable<dish>("dish", {
  orderByFields: ["id"],
  settings: { index_granularity: "8192" },
});
