import { IngestPipeline } from "@514labs/moose-lib";

// Rooms table record structure (from SQL Server)
export interface RoomsRecord {
  id: number;
  hotel_id: string;
  name: string;
  description: string | null;
  total_rooms: number | null;
  used_rooms: number | null;
  left_rooms: number | null;
}

// Debezium source metadata
export interface DebeziumSource {
  version: string;
  connector: string;
  name: string;
  ts_ms: number;
  snapshot: string | null;
  db: string;
  sequence: string | null;
  ts_us: number | null;
  ts_ns: number | null;
  schema: string;
  table: string;
  change_lsn: string | null;
  commit_lsn: string | null;
  event_serial_no: number | null;
}

// Transaction metadata (can be null)
export interface DebeziumTransaction {
  id: string;
  total_order: number;
  data_collection_order: number;
}

// Main Debezium envelope structure
export interface SqlServer {
  before: RoomsRecord | null;  // Previous state (null for INSERT)
  after: RoomsRecord | null;   // New state (null for DELETE) 
  source: DebeziumSource;      // CDC metadata
  op: "r" | "c" | "u" | "d";   // Operation: read, create, update, delete
  ts_ms: number;               // Event timestamp (milliseconds)
  ts_us?: number;              // Event timestamp (microseconds)
  ts_ns?: number;              // Event timestamp (nanoseconds)
  transaction: DebeziumTransaction | null; // Transaction info
}

export const SqlServerPipeline = new IngestPipeline<SqlServer>("SqlServer", {
  table: {
    orderByFields: ["ts_ms"],
    deduplicate: true,
  },
  stream: true,
  ingest: true,
});