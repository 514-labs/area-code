import { IngestPipeline, Stream, Key, OlapTable} from "@514labs/moose-lib";
import { FooWithCDC, BarWithCDC, FooStatus } from "@workspace/models";
import { sendDataToElasticsearch, prepareElasticsearchData } from "../utils/elasticsearch";

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


// Debezium CDC Schema
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

// Debezium CDC Payload
export interface SqlServerDebeziumPayload {
  schema: CDCSchema;
  payload: CDCPayload;
}

// Table to store all the CDC events - for record keeping
export interface ProcessSqlServerDebeziumPayload {
  time: Key<Date>;
  payload: Record<string, any>;
}

// Transform the Debezium CDC payload to a format that can be stored in a database table - with a key
export const transformSqlServerDebeziumPayload = (payload: SqlServerDebeziumPayload) => {
  return {
    time: new Date(),
    payload: payload,
  };
};

// Transform function to convert SQL Server Debezium CDC events for 'foo' table into FooWithCDC format for the existing Foo pipeline
export const transformToFooWithCDC = (payload: SqlServerDebeziumPayload, sendToElasticsearch: boolean = true): FooWithCDC | null => {
  if (payload.payload.source.table !== "foo") {
    console.log("Skipping non-foo table");
    return null;
  }

  const after = payload.payload.after;
  const before = payload.payload.before;
  const op = payload.payload.op;
  const source = payload.payload.source;
  
  let result: FooWithCDC | null = null;
  
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

      result = {
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
      break;
      
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
      result = {
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
      break;
      
    default:
      console.log(`Unknown foo operation: ${op}`);
      return null;
  }

  // Send to Elasticsearch as a side effect (non-blocking)
  if (result && sendToElasticsearch) {
    setImmediate(async () => {
      try {
        const { action, data } = prepareElasticsearchData(result, result.cdc_operation);
        await sendDataToElasticsearch("foo", action, data);
      } catch (error) {
        console.error("Error sending foo data to Elasticsearch:", error);
      }
    });
  }

  return result;
};

/**
 * Transform function to convert SQL Server Debezium CDC events for 'bar' table
 * into BarWithCDC format for the existing Bar pipeline
 */
export const transformToBarWithCDC = (payload: SqlServerDebeziumPayload, sendToElasticsearch: boolean = true): BarWithCDC | null => {
  if (payload.payload.source.table !== "bar") {
    console.log("Skipping non-bar table");
    return null;
  }

  const after = payload.payload.after;
  const before = payload.payload.before;
  const op = payload.payload.op;
  const source = payload.payload.source;
  
  let result: BarWithCDC | null = null;
  
  // Handle different CDC operations
  switch (op) {
    case "r": // Read (initial snapshot)
    case "c": // Create (insert)
    case "u": // Update
      if (!after) {
        console.log(`No 'after' data for bar operation ${op}, skipping`);
        return null;
      }

      result = {
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
      break;
      
    case "d": // Delete
      if (!before) {
        console.log("No 'before' data for bar delete operation, skipping");
        return null;
      }

      // For deletes, use before data with DELETE operation
      result = {
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
      break;
      
    default:
      console.log(`Unknown bar operation: ${op}`);
      return null;
  }

  // Send to Elasticsearch as a side effect (non-blocking)
  if (result && sendToElasticsearch) {
    setImmediate(async () => {
      try {
        const { action, data } = prepareElasticsearchData(result, result.cdc_operation);
        await sendDataToElasticsearch("bar", action, data);
      } catch (error) {
        console.error("Error sending bar data to Elasticsearch:", error);
      }
    });
  }

  return result;
};

