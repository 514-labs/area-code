import { Task, Workflow } from "@514labs/moose-lib";
import { createSupabaseClient } from "./supabase-client";
import { FooWithCDC, BarWithCDC, FooStatus } from "@workspace/models";

// Additional environment variables for service integrations
const ANALYTICS_BASE_URL =
  process.env.ANALYTICS_BASE_URL || "http://localhost:4100";
const RETRIEVAL_BASE_URL =
  process.env.RETRIEVAL_BASE_URL || "http://localhost:8083";

// Enhanced logging function
const logEvent = (
  event: string,
  table: string,
  payload: Record<string, unknown>
) => {
  const timestamp = new Date().toISOString();
  console.error(`\n[${timestamp}] ${event} event on ${table} table:`);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  console.log("---");
};

// HTTP client for sending data to Elasticsearch via retrieval service
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

// HTTP client for sending data to analytical pipelines
const sendDataToPipeline = async (
  type: "Foo" | "Bar",
  data: FooWithCDC | BarWithCDC
) => {
  const analyticsUrl = ANALYTICS_BASE_URL;
  const url = `${analyticsUrl}/ingest/${type}`;

  try {
    console.log(`📊 Sending ${type} data to analytical pipeline: ${url}`);

    // Helper function to safely format dates
    const formatDate = (dateValue: unknown): string => {
      if (dateValue instanceof Date) {
        return dateValue.toISOString();
      }
      if (typeof dateValue === "string" && dateValue) {
        const date = new Date(dateValue);
        return isNaN(date.getTime())
          ? new Date().toISOString()
          : date.toISOString();
      }
      // For missing dates (like in DELETE events), use current timestamp
      return new Date().toISOString();
    };

    // Format dates properly for JSON serialization
    const formattedData = {
      ...data,
      created_at: formatDate(data.created_at),
      updated_at: formatDate(data.updated_at),
      cdc_timestamp: data.cdc_timestamp.toISOString(),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedData),
    });

    if (response.ok) {
      console.log(`✅ Successfully sent ${type} data to analytical pipeline`);
    } else {
      console.error(
        `❌ Failed to send ${type} data to analytical pipeline:`,
        response.status,
        response.statusText
      );
      const errorText = await response.text();
      console.error("Response:", errorText);
    }
  } catch (error) {
    console.error(
      `❌ Error sending ${type} data to analytical pipeline:`,
      error
    );
  }
};

// Define interface for Supabase realtime payload
interface RealtimePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
  commit_timestamp?: string;
}

// Business logic handlers for each table
async function handleFooChange(payload: RealtimePayload) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  // Determine the action based on event type and changes
  let action: "created" | "updated" | "deleted" | "activated" | "deactivated";
  // let changes: string[] = [];

  switch (eventType) {
    case "INSERT":
      if (!newRecord) {
        console.error("INSERT event missing new record");
        return;
      }
      action = "created";
      console.log(`🔔 Business Logic: New foo "${newRecord.name}" created`);
      break;
    case "UPDATE":
      if (!newRecord || !oldRecord) {
        console.error("UPDATE event missing records");
        return;
      }
      // Determine specific update type
      if (oldRecord.is_active !== newRecord.is_active) {
        action = newRecord.is_active ? "activated" : "deactivated";
        console.log(`🔔 Business Logic: Foo "${newRecord.name}" ${action}`);
      } else {
        action = "updated";
        console.log(`🔔 Business Logic: Foo "${newRecord.name}" updated`);
      }

      // Track which fields changed
      // changes = Object.keys(newRecord).filter(
      //   (key) =>
      //     JSON.stringify(oldRecord[key]) !== JSON.stringify(newRecord[key])
      // );
      break;
    case "DELETE":
      if (!oldRecord) {
        console.error("DELETE event missing old record");
        return;
      }
      action = "deleted";
      console.log(`🔔 Business Logic: Foo "${oldRecord.name}" was deleted`);
      break;
    default:
      console.warn(`Unknown event type: ${eventType}`);
      return;
  }

  try {
    const cdc_operation =
      eventType === "INSERT"
        ? "INSERT"
        : eventType === "UPDATE"
          ? "UPDATE"
          : "DELETE";

    // For DELETE events, use oldRecord; for INSERT/UPDATE, use newRecord
    const sourceData = eventType === "DELETE" ? oldRecord : newRecord;

    if (sourceData) {
      let fooPipelineData: FooWithCDC;

      if (eventType === "DELETE") {
        // For DELETE events, we only get the ID, so create a complete record with defaults
        fooPipelineData = {
          id: sourceData.id as string,
          name: "", // Unknown - record was deleted
          description: null,
          status: FooStatus.ARCHIVED, // Mark as archived since it's deleted
          priority: 0,
          is_active: false,
          metadata: {},
          tags: [],
          score: 0,
          large_text: "",
          created_at: new Date(), // Use current time as fallback
          updated_at: new Date(), // Use current time as fallback
          cdc_id: `foo-${sourceData.id}-${Date.now()}`,
          cdc_operation: "DELETE",
          cdc_timestamp: new Date(),
        };
      } else {
        // For INSERT/UPDATE events, we have the full record
        fooPipelineData = {
          ...sourceData,
          cdc_id: `foo-${sourceData.id}-${Date.now()}`,
          cdc_operation,
          cdc_timestamp: new Date(),
        } as FooWithCDC;
      }

      await sendDataToPipeline("Foo", fooPipelineData);
    }

    // Also send to Elasticsearch for search indexing
    if (eventType === "DELETE" && oldRecord) {
      await sendDataToElasticsearch("foo", "delete", { id: oldRecord.id });
    } else if (newRecord) {
      await sendDataToElasticsearch("foo", "index", newRecord);
    }
  } catch (error) {
    console.error("Error creating/sending FooThingEvent:", error);
  }
}

async function handleBarChange(payload: RealtimePayload) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  // Determine the action based on event type and changes
  let action: "created" | "updated" | "deleted" | "enabled" | "disabled";
  // let changes: string[] = [];

  switch (eventType) {
    case "INSERT":
      if (!newRecord) {
        console.error("INSERT event missing new record");
        return;
      }
      action = "created";
      console.log(
        `🔔 Business Logic: New bar with value ${newRecord.value} created`
      );
      break;
    case "UPDATE":
      if (!newRecord || !oldRecord) {
        console.error("UPDATE event missing records");
        return;
      }
      // Determine specific update type
      if (oldRecord.is_enabled !== newRecord.is_enabled) {
        action = newRecord.is_enabled ? "enabled" : "disabled";
        console.log(`🔔 Business Logic: Bar ${action}`);
      } else {
        action = "updated";
        console.log(`🔔 Business Logic: Bar updated`);
      }

      // Track which fields changed
      // changes = Object.keys(newRecord).filter(
      //   (key) =>
      //     JSON.stringify(oldRecord[key]) !== JSON.stringify(newRecord[key])
      // );
      break;
    case "DELETE":
      if (!oldRecord) {
        console.error("DELETE event missing old record");
        return;
      }
      action = "deleted";
      console.log(
        `🔔 Business Logic: Bar with value ${oldRecord.value} was deleted`
      );
      break;
    default:
      console.warn(`Unknown event type: ${eventType}`);
      return;
  }

  // Create and send BarThingEvent to analytics
  try {
    // Send to analytical pipeline for CDC processing
    const cdc_operation =
      eventType === "INSERT"
        ? "INSERT"
        : eventType === "UPDATE"
          ? "UPDATE"
          : "DELETE";

    // For DELETE events, use oldRecord; for INSERT/UPDATE, use newRecord
    const sourceData = eventType === "DELETE" ? oldRecord : newRecord;

    if (sourceData) {
      let barPipelineData: BarWithCDC;

      if (eventType === "DELETE") {
        // For DELETE events, we only get the ID, so create a complete record with defaults
        barPipelineData = {
          id: sourceData.id as string,
          foo_id: "", // Unknown - record was deleted
          value: 0,
          label: null,
          notes: null,
          is_enabled: false,
          created_at: new Date(), // Use current time as fallback
          updated_at: new Date(), // Use current time as fallback
          cdc_id: `bar-${sourceData.id}-${Date.now()}`,
          cdc_operation: "DELETE",
          cdc_timestamp: new Date(),
        };
      } else {
        // For INSERT/UPDATE events, we have the full record
        barPipelineData = {
          ...sourceData,
          cdc_id: `bar-${sourceData.id}-${Date.now()}`,
          cdc_operation,
          cdc_timestamp: new Date(),
        } as BarWithCDC;
      }

      await sendDataToPipeline("Bar", barPipelineData);
    }

    // Also send to Elasticsearch for search indexing
    if (eventType === "DELETE" && oldRecord) {
      await sendDataToElasticsearch("bar", "delete", { id: oldRecord.id });
    } else if (newRecord) {
      await sendDataToElasticsearch("bar", "index", newRecord);
    }
  } catch (error) {
    console.error("Error creating/sending BarThingEvent:", error);
  }
}

// Long-running Supabase listener task
export const supabaseListenerTask = new Task<null, void>("supabase-listener", {
  run: async () => {
    console.log("🚀 Starting Supabase realtime listener...");
    console.log("Initializing Supabase client...");

    // Create Supabase client and get configuration
    const { client: supabase, config: supabaseConfig } = createSupabaseClient();

    console.log("Configuration summary:");
    console.log("- supabaseUrl:", supabaseConfig.supabaseUrl);
    console.log("- schema:", supabaseConfig.dbSchema);
    console.log("✅ Supabase client ready and configured");

    // Set up a single channel for all table changes
    const channel = supabase
      .channel("db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: supabaseConfig.dbSchema,
          table: "foo",
        },
        async (payload) => {
          logEvent("FOO CHANGE", "foo", payload);
          await handleFooChange(payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: supabaseConfig.dbSchema,
          table: "bar",
        },
        async (payload) => {
          logEvent("BAR CHANGE", "bar", payload);
          await handleBarChange(payload);
        }
      )
      .subscribe((status, error) => {
        // Log status with appropriate emoji/level based on status type
        const timestamp = new Date().toISOString();

        if (status === "SUBSCRIBED") {
          console.log(
            `✅ [${timestamp}] Database changes listener status: ${status}`
          );
          console.log("🎉 Successfully connected to all database tables!");
          console.log("   - foo table: ✅");
          console.log("   - bar table: ✅");
        } else if (status === "CLOSED") {
          console.warn(
            `❌ [${timestamp}] Database changes listener status: ${status}`
          );
          console.warn("Connection to database tables closed");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(
            `❌ [${timestamp}] Database changes listener ERROR: ${status}`
          );
          console.error("🚨 Realtime connection failed!");
          console.error("Debugging information:");
          console.error("- Status:", status);
          console.error("- Supabase URL:", supabaseConfig.supabaseUrl);
          console.error("- Database schema:", supabaseConfig.dbSchema);
          console.error("- Tables being monitored: foo, bar");

          if (error) {
            console.error("- Error details:", error);
            console.error(
              "- Error message:",
              error.message || "No message available"
            );
            // Safely access extended error properties
            const errorWithDetails = error as Error & {
              code?: string;
              details?: string;
              hint?: string;
            };
            console.error(
              "- Error code:",
              errorWithDetails.code || "No code available"
            );
          } else {
            console.error("- No additional error details...");
          }
        } else {
          // Handle other statuses (CONNECTING, etc.)
          console.log(
            `🔄 [${timestamp}] Database changes listener status: ${status}`
          );
        }

        // Always log error details if provided
        if (error) {
          console.error(`❌ [${timestamp}] Subscription error:`, error);
          if (error.message) {
            console.error("Error message:", error.message);
          }
          // Safely access extended error properties
          const errorWithDetails = error as Error & {
            details?: string;
            hint?: string;
          };
          if (errorWithDetails.details) {
            console.error("Error details:", errorWithDetails.details);
          }
          if (errorWithDetails.hint) {
            console.error("Error hint:", errorWithDetails.hint);
          }
        }
      });

    // Handle graceful shutdown
    const cleanup = () => {
      console.log("\n🔄 Cleaning up Supabase subscription...");
      if (channel) {
        channel.unsubscribe();
      }
      console.log("✅ Cleanup complete");
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    console.log("\n🎯 Supabase realtime listeners are now active!");
    console.log("Listening for changes on tables: foo, bar");
    console.log("The task will run indefinitely until stopped...");

    // Wait a bit to see initial connection status
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("📊 Initial connection setup complete");

    // Keep the task running indefinitely
    return new Promise<void>(() => {
      // This promise never resolves, keeping the task alive
      // The task will only end when the workflow is terminated
    });
  },
  // Set a longer timeout for the long-running task
  timeout: "24h",
});

// Create the workflow with the long-running listener task
export const supabaseListenerWorkflow = new Workflow("supabase-listener", {
  startingTask: supabaseListenerTask,
  // Run indefinitely until manually stopped
  timeout: "24h",
});
