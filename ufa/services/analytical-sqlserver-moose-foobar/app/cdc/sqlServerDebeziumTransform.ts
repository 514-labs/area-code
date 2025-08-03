import { FooWithCDC, BarWithCDC, FooStatus } from "@workspace/models";
import { SqlServerDebeziumPayload } from "../models/debeziumPayload";

type CDCOperation = "INSERT" | "UPDATE" | "DELETE";

// HTTP client for sending data to Elasticsearch via retrieval service
const RETRIEVAL_BASE_URL = process.env.RETRIEVAL_BASE_URL || "http://localhost:8086";

const sendDataToElasticsearch = async (
    type: "foo" | "bar",
    action: "index" | "delete",
    data: Record<string, unknown>
  ) => {
    console.log("Sending data to Elasticsearch:", type, action, data);
    const retrievalUrl = RETRIEVAL_BASE_URL;
    const url = `${retrievalUrl}/api/ingest/${type}`;
  
    try {
      console.log(`🔍 Sending ${type} ${action} to Elasticsearch: ${url}`);
  
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, data }),
      });
  
      if (response.ok) {
        console.log(`✅ Successfully sent ${type} ${action} to Elasticsearch`);
      } else {
        console.error(
          `❌ Failed to send ${type} ${action} to Elasticsearch:`,
          response.status,
          response.statusText
        );
        const errorText = await response.text();
        console.error("Response:", errorText);
      }
    } catch (error) {
      console.error(
        `❌ Error sending ${type} ${action} to Elasticsearch:`,
        error
      );
    }
};

export const transformDebeziumPayloadToFooWithCDC = (payload: SqlServerDebeziumPayload): FooWithCDC | null => {
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
  
        const transformedData = {
          id: after.id,
          name: after.name,
          description: after.description || null,
          status: after.status as FooStatus || FooStatus.ACTIVE,
          priority: after.priority || 1,
          is_active: after.is_active || false,
          metadata: metadata,
          tags: tags,
          score: after.score,
          large_text: after.large_text || "",
          created_at: after.created_at ? new Date(after.created_at / 1000000) : new Date(), // Convert nanoseconds to milliseconds
          updated_at: after.updated_at ? new Date(after.updated_at / 1000000) : new Date(),
          // CDC metadata
          cdc_id: `${source.table}_${after.id}_${payload.payload.ts_ms}`,
          cdc_operation: op === "r" ? "INSERT" : (op === "c" ? "INSERT" : "UPDATE") as CDCOperation,
          cdc_timestamp: new Date(payload.payload.ts_ms)
        };

        // Send to Elasticsearch for search indexing (non-blocking)
        sendDataToElasticsearch("foo", "index", transformedData);

        return transformedData;
        
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
        const deletedData = {
          id: before.id,
          name: before.name,
          description: before.description || null,
          status: before.status as FooStatus || FooStatus.ACTIVE,
          priority: before.priority || 1,
          is_active: before.is_active || false,
          metadata: beforeMetadata,
          tags: beforeTags,
          score: before.score || 0.0,
          large_text: before.large_text || "",
          created_at: before.created_at ? new Date(before.created_at / 1000000) : new Date(),
          updated_at: before.updated_at ? new Date(before.updated_at / 1000000) : new Date(),
          // CDC metadata
          cdc_id: `${source.table}_${before.id}_${payload.payload.ts_ms}`,
          cdc_operation: "DELETE" as CDCOperation,
          cdc_timestamp: new Date(payload.payload.ts_ms)
        };

        // Send delete to Elasticsearch for search indexing (non-blocking)
        sendDataToElasticsearch("foo", "delete", { id: before.id });

        return deletedData;
        
      default:
        console.log(`Unknown foo operation: ${op}`);
        return null;
    }
};
  
  /**
   * Transform function to convert SQL Server Debezium CDC events for 'bar' table
   * into BarWithCDC format for the existing Bar pipeline
   */
export const transformDebeziumPayloadToBarWithCDC = (payload: SqlServerDebeziumPayload): BarWithCDC | null => {
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

      const transformedData = {
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
        cdc_operation: op === "r" ? "INSERT" : (op === "c" ? "INSERT" : "UPDATE") as CDCOperation,
        cdc_timestamp: new Date(payload.payload.ts_ms)
      };

      // Send to Elasticsearch for search indexing (non-blocking)
      sendDataToElasticsearch("bar", "index", transformedData);

      return transformedData;
      
    case "d": // Delete
      if (!before) {
        console.log("No 'before' data for bar delete operation, skipping");
        return null;
      }

      // For deletes, use before data with DELETE operation
      const deletedData = {
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
        cdc_operation: "DELETE" as CDCOperation,
        cdc_timestamp: new Date(payload.payload.ts_ms)
      };

      // Send delete to Elasticsearch for search indexing (non-blocking)
      sendDataToElasticsearch("bar", "delete", { id: before.id });

      return deletedData;
      
    default:
      console.log(`Unknown bar operation: ${op}`);
      return null;
  }
};
  