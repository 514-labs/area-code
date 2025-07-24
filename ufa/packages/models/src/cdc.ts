// Change Data Capture (CDC) interface for database change tracking
export interface CDC {
  cdc_id: string;
  cdc_operation: "INSERT" | "UPDATE" | "DELETE";
  cdc_timestamp: Date;
}