import { IngestPipeline, Stream, Key, OlapTable} from "@514labs/moose-lib";
import { FooWithCDC, BarWithCDC, FooStatus } from "@workspace/models";

/**
 * Helper function to convert Debezium decimal fields from base64 bytes to number
 */
function convertDebeziumDecimal(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    // If it's already a string number, parse it
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return parsed;
    }
    
    // Try to decode base64 if it's base64 encoded
    try {
      const decoded = Buffer.from(value, 'base64');
      // Simple conversion for small decimals - this is a basic implementation
      // For production, you might want a more robust decimal conversion
      return parseFloat(decoded.toString()) || 0.0;
    } catch (e) {
      console.warn("Failed to decode decimal value:", value);
      return 0.0;
    }
  }
  return 0.0;
}


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

/**
 * Transform function to convert SQL Server Debezium CDC events for 'foo' table
 * into FooWithCDC format for the existing Foo pipeline
 */
export const transformToFooWithCDC = (payload: SqlServerDebeziumPayload): FooWithCDC | null => {
  if (payload.payload.source.table !== "foo") {
    console.log("Skipping non-foo table");
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
        console.log(`No 'after' data for foo operation ${op}, skipping`);
        return null;
      }
      
      // Parse JSON fields from SQL Server
      let metadata: Record<string, any> = {};
      let tags: string[] = [];
      
      try {
        if (after.metadata && typeof after.metadata === 'string') {
          metadata = JSON.parse(after.metadata);
        }
      } catch (e) {
        console.warn("Failed to parse foo metadata JSON:", after.metadata);
        metadata = {};
      }
      
      try {
        if (after.tags && typeof after.tags === 'string') {
          tags = JSON.parse(after.tags);
        }
      } catch (e) {
        console.warn("Failed to parse foo tags JSON:", after.tags);
        tags = [];
      }

      return {
        id: after.id,
        name: after.name,
        description: after.description || null,
        status: after.status as FooStatus || FooStatus.ACTIVE,
        priority: after.priority || 1,
        is_active: after.is_active || false,
        metadata: metadata,
        tags: tags,
        score: convertDebeziumDecimal(after.score) || 0.0,
        large_text: after.large_text || "",
        created_at: after.created_at ? new Date(after.created_at / 1000000) : new Date(), // Convert nanoseconds to milliseconds
        updated_at: after.updated_at ? new Date(after.updated_at / 1000000) : new Date(),
        // CDC metadata
        cdc_id: `${source.table}_${after.id}_${payload.payload.ts_ms}`,
        cdc_operation: op === "r" ? "INSERT" : (op === "c" ? "INSERT" : "UPDATE"),
        cdc_timestamp: new Date(payload.payload.ts_ms)
      };
      
    case "d": // Delete
      if (!before) {
        console.log("No 'before' data for foo delete operation, skipping");
        return null;
      }
      
      // Parse JSON fields from before data
      let beforeMetadata: Record<string, any> = {};
      let beforeTags: string[] = [];
      
      try {
        if (before.metadata && typeof before.metadata === 'string') {
          beforeMetadata = JSON.parse(before.metadata);
        }
      } catch (e) {
        console.warn("Failed to parse foo before metadata JSON:", before.metadata);
        beforeMetadata = {};
      }
      
      try {
        if (before.tags && typeof before.tags === 'string') {
          beforeTags = JSON.parse(before.tags);
        }
      } catch (e) {
        console.warn("Failed to parse foo before tags JSON:", before.tags);
        beforeTags = [];
      }

      // For deletes, use before data with DELETE operation
      return {
        id: before.id,
        name: before.name,
        description: before.description || null,
        status: before.status as FooStatus || FooStatus.ACTIVE,
        priority: before.priority || 1,
        is_active: before.is_active || false,
        metadata: beforeMetadata,
        tags: beforeTags,
        score: convertDebeziumDecimal(before.score) || 0.0,
        large_text: before.large_text || "",
        created_at: before.created_at ? new Date(before.created_at / 1000000) : new Date(),
        updated_at: before.updated_at ? new Date(before.updated_at / 1000000) : new Date(),
        // CDC metadata
        cdc_id: `${source.table}_${before.id}_${payload.payload.ts_ms}`,
        cdc_operation: "DELETE",
        cdc_timestamp: new Date(payload.payload.ts_ms)
      };
      
    default:
      console.log(`Unknown foo operation: ${op}`);
      return null;
  }
};

/**
 * Transform function to convert SQL Server Debezium CDC events for 'bar' table
 * into BarWithCDC format for the existing Bar pipeline
 */
export const transformToBarWithCDC = (payload: SqlServerDebeziumPayload): BarWithCDC | null => {
  if (payload.payload.source.table !== "bar") {
    console.log("Skipping non-bar table");
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
        console.log(`No 'after' data for bar operation ${op}, skipping`);
        return null;
      }

      return {
        id: after.id,
        foo_id: after.foo_id,
        value: after.value || 0,
        label: after.label || null,
        notes: after.notes || null,
        is_enabled: after.is_enabled || false,
        created_at: after.created_at ? new Date(after.created_at / 1000000) : new Date(), // Convert nanoseconds to milliseconds
        updated_at: after.updated_at ? new Date(after.updated_at / 1000000) : new Date(),
        // CDC metadata
        cdc_id: `${source.table}_${after.id}_${payload.payload.ts_ms}`,
        cdc_operation: op === "r" ? "INSERT" : (op === "c" ? "INSERT" : "UPDATE"),
        cdc_timestamp: new Date(payload.payload.ts_ms)
      };
      
    case "d": // Delete
      if (!before) {
        console.log("No 'before' data for bar delete operation, skipping");
        return null;
      }

      // For deletes, use before data with DELETE operation
      return {
        id: before.id,
        foo_id: before.foo_id,
        value: before.value || 0,
        label: before.label || null,
        notes: before.notes || null,
        is_enabled: before.is_enabled || false,
        created_at: before.created_at ? new Date(before.created_at / 1000000) : new Date(),
        updated_at: before.updated_at ? new Date(before.updated_at / 1000000) : new Date(),
        // CDC metadata
        cdc_id: `${source.table}_${before.id}_${payload.payload.ts_ms}`,
        cdc_operation: "DELETE",
        cdc_timestamp: new Date(payload.payload.ts_ms)
      };
      
    default:
      console.log(`Unknown bar operation: ${op}`);
      return null;
  }
};

