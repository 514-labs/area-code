import { MaterializedView, ClickHouseEngines, Aggregated, sql } from "@514labs/moose-lib";
import { FooPipeline } from "../index";

// Schema for the aggregating view with proper state types matching the exact ClickHouse source types
interface FooCurrentStateSchema {
  id: string;
  name: string & Aggregated<"argMax", [string, Date]>;                    // String
  description: string & Aggregated<"argMax", [string, Date]>;             // Handle nullable in query
  status: string & Aggregated<"argMax", [string, Date]>;                  // Enum8 -> String
  priority: string & Aggregated<"argMax", [number, Date]>;                // Float64
  is_active: string & Aggregated<"argMax", [boolean, Date]>;              // Bool
  metadata: string & Aggregated<"argMax", [string, Date]>;                // JSON -> String
  tags: string & Aggregated<"argMax", [string[], Date]>;                  // Array(String)
  score: string & Aggregated<"argMax", [number, Date]>;                   // Float64
  large_text: string & Aggregated<"argMax", [string, Date]>;              // String
  created_at: string & Aggregated<"argMax", [Date, Date]>;                // DateTime('UTC')
  updated_at: string & Aggregated<"argMax", [Date, Date]>;                // DateTime('UTC')
  latest_operation: string & Aggregated<"argMax", [string, Date]>;        // String
}

// SQL query using aggregate state functions with proper nullable handling
const query = sql`
  SELECT 
    id,
    argMaxState(name, cdc_timestamp) as name,
    argMaxState(COALESCE(description, ''), cdc_timestamp) as description,  -- Convert nullable to empty string
    argMaxState(toString(status), cdc_timestamp) as status,                 -- Convert Enum8 to String
    argMaxState(priority, cdc_timestamp) as priority,
    argMaxState(is_active, cdc_timestamp) as is_active,
    argMaxState(toString(metadata), cdc_timestamp) as metadata,
    argMaxState(tags, cdc_timestamp) as tags,
    argMaxState(score, cdc_timestamp) as score,
    argMaxState(large_text, cdc_timestamp) as large_text,
    argMaxState(created_at, cdc_timestamp) as created_at,
    argMaxState(updated_at, cdc_timestamp) as updated_at,
    argMaxState(cdc_operation, cdc_timestamp) as latest_operation
  FROM ${FooPipeline.table!}
  GROUP BY id
`;

// Materialized view using AggregatingMergeTree for proper CDC deduplication
export const FooCurrentStateView = new MaterializedView<FooCurrentStateSchema>({
  selectStatement: query,
  selectTables: [FooPipeline.table!],
  tableName: "foo_current_state",
  materializedViewName: "foo_current_state_mv",
  engine: ClickHouseEngines.AggregatingMergeTree,
  orderByFields: ["id"],
}); 