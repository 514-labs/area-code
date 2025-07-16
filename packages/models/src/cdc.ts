import { Key } from "@514labs/moose-lib";

export interface CDC {
  cdc_id: Key<string>;
  cdc_operation: "INSERT" | "UPDATE" | "DELETE";
  cdc_timestamp: Date;
}