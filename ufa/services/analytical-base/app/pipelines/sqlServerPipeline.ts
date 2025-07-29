import { IngestPipeline, Stream, Key, OlapTable} from "@514labs/moose-lib";


interface CDCSchema {
  type: string;
  fields: {
    name: string;
    type: string;
  }[];
  optional: boolean;
  name: string;
  field: string;
}

interface CDCSource {
  version: string;
  connector: string;
  name: string;
  ts_ms: number;
  snapshot: boolean;
  db: string;
  sequence?: string;
  ts_us?: number;
  ts_ns?: number;
  schema: string;
  table: string;
  change_lsn?: string;
  commit_lsn?: string;
  event_serial_no?: number;
}

interface CDCPayload {
  before?: Record<string, any>;
  after: Record<string, any>;
  source: CDCSource;
  op: "r" | "c" | "u" | "d";
  ts_ms: number;
  ts_us?: number;
  ts_ns?: number;
}


export interface SqlServerDebeziumPayload {
  schema: CDCSchema;
  payload: CDCPayload;
}

// Stream the Debezium writes to 


export interface ProcessSqlServerDebeziumPayload {
  time: Key<Date>;
  payload: Record<string, any>;
}



export const transformSqlServerDebeziumPayload = (payload: SqlServerDebeziumPayload) => {
  const after = payload.payload.after;
  const before = payload.payload.before;
  const op = payload.payload.op;
  const source = payload.payload.source;
  const ts_ms = payload.payload.ts_ms;
  const ts_us = payload.payload.ts_us;
  const ts_ns = payload.payload.ts_ns;
  console.log("AFTER:");
  console.log(JSON.stringify(after, null, 2));
  console.log("BEFORE:");
  console.log(JSON.stringify(before, null, 2));
  console.log("OPERATION:");
  console.log(op);
  console.log("SOURCE:");
  console.log(source);
  console.log("TIMESTAMP MS:");
  console.log(ts_ms);
  console.log("TIMESTAMP US:");
  console.log(ts_us);
  console.log("TIMESTAMP NS:");
  console.log(ts_ns);
  console.log("--------------------------------");

  return {
    time: new Date(),
    payload: payload,
  };
};

/**
 * Interface representing the rooms table structure from SQL Server
 */

export const transformToReplicatedRoom = (payload: SqlServerDebeziumPayload): Room | null => {
  if (payload.payload.source.table !== "rooms") {
    console.log("Skipping non-room table");
    return null;
  }

  const after = payload.payload.after;
  const before = payload.payload.before;
  const op = payload.payload.op;
  const source = payload.payload.source;
  
  // Handle different CDC operations
  switch (op) {
    case "r": // Read (initial snapshot)
    case "c": // Create (insert)
    case "u": // Update
      if (!after) {
        console.log(`No 'after' data for operation ${op}, skipping`);
        return null;
      }
      return {
        id: after.id,
        hotel_id: after.hotel_id,
        name: after.name,
        description: after.description || null,
        total_rooms: after.total_rooms || null,
        used_rooms: after.used_rooms || null,
        left_rooms: after.left_rooms || null,
        is_deleted: false,
        version: payload.payload.ts_ms, // Use Debezium timestamp as version
        cdc_operation: op,
        cdc_timestamp: new Date(payload.payload.ts_ms)
      };
      
    case "d": // Delete
      if (!before) {
        console.log("No 'before' data for delete operation, skipping");
        return null;
      }
      // For deletes, we insert a record with the before data marked as deleted
      return {
        id: before.id,
        hotel_id: before.hotel_id,
        name: before.name,
        description: before.description || null,
        total_rooms: before.total_rooms || null,
        used_rooms: before.used_rooms || null,
        left_rooms: before.left_rooms || null,
        is_deleted: true,
        version: payload.payload.ts_ms, // Use Debezium timestamp as version
        cdc_operation: op,
        cdc_timestamp: new Date(payload.payload.ts_ms)
      };
      
    default:
      console.log(`Unknown operation: ${op}`);
      return null;
  }
};

export interface Room {
  id: Key<number>;                    // INTEGER IDENTITY(101,1) NOT NULL PRIMARY KEY
  hotel_id: string;             // VARCHAR(255) NOT NULL
  name: Key<string>;                 // VARCHAR(255) NOT NULL
  description?: string | null;   // VARCHAR(512)
  total_rooms?: number | null;   // INTEGER
  used_rooms?: number | null;    // INTEGER
  left_rooms?: number | null;    // INTEGER 
  
  // CDC metadata fields for ReplacingMergeTree
  is_deleted: boolean;          // Track deletion status
  version: number;              // Version for ReplacingMergeTree (using Debezium timestamp)
  cdc_operation: string;        // Track the CDC operation type for debugging
  cdc_timestamp: Date;          // When the change occurred
}


export const replicatedRoomPipeline = new IngestPipeline<Room>("replicatedRoom", {
  stream: true,
  table: {         
    orderByFields: ["id", "name", "version"], // Include version for ReplacingMergeTree
    deduplicate: true
  },
  ingest: false,
});

