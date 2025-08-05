import { MaterializedView, ClickHouseEngines, sql } from "@514labs/moose-lib";
import { FooPipeline } from "../index";
import { FooWithCDC } from "@workspace/models";

export type FooCurrentStateSchema = Omit<
  FooWithCDC,
  "cdc_id" | "cdc_timestamp"
>;

const query = sql`
  SELECT 
    id,
    name,
    description,    
    status,
    priority,
    is_active,  
    metadata,
    tags,
    score,
    large_text,
    created_at,
    updated_at,
    cdc_operation
  FROM ${FooPipeline.table!}
`;

export const FooCurrentStateView = new MaterializedView<FooCurrentStateSchema>({
  selectStatement: query,
  selectTables: [FooPipeline.table!],
  tableName: "foo_current_state",
  materializedViewName: "foo_current_state_mv",
  engine: ClickHouseEngines.ReplacingMergeTree,
  orderByFields: ["id"],
});
