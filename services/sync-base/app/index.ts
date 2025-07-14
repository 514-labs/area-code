// Welcome to your new Moose analytical backend! 🦌

// Getting Started Guide:

// 1. Data Modeling
// First, plan your data structure and create your data models
// → See: docs.fiveonefour.com/moose/building/data-modeling
//   Learn about type definitions and data validation

// 2. Set Up Ingestion
// Create ingestion pipelines to receive your data via REST APIs
// → See: docs.fiveonefour.com/moose/building/ingestion
//   Learn about IngestPipeline, data formats, and validation

// 3. Create Workflows
// Build data processing pipelines to transform and analyze your data
// → See: docs.fiveonefour.com/moose/building/workflows
//   Learn about task scheduling and data processing

// 4. Configure Consumption APIs
// Set up queries and real-time analytics for your data
// → See: docs.fiveonefour.com/moose/building/consumption-apis

// Need help? Check out the quickstart guide:
// → docs.fiveonefour.com/moose/getting-started/quickstart

import { Task, Workflow } from "@514labs/moose-lib";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { 
  createFooThingEvent, 
  createBarThingEvent,
  type FooThingEvent,
  type BarThingEvent
} from "@workspace/models";

// Load environment variables
dotenv.config();

// Configuration interface for the workflow
interface SyncConfig {
  supabaseUrl: string;
  supabaseKey: string;
  dbSchema: string;
}

// Initialize configuration
const config: SyncConfig = {
  supabaseUrl: process.env.SUPABASE_PUBLIC_URL || "http://localhost:8000",
  supabaseKey: process.env.SERVICE_ROLE_KEY || "",
  dbSchema: process.env.DB_SCHEMA || "public",
};

// Additional environment variables for service integrations
const ANALYTICS_BASE_URL = process.env.ANALYTICS_BASE_URL || "http://localhost:4100";
const RETRIEVAL_BASE_URL = process.env.RETRIEVAL_BASE_URL || "http://localhost:8083";

// Enhanced logging function
const logEvent = (event: string, table: string, payload: any) => {
  const timestamp = new Date().toISOString();
  console.error(`\n[${timestamp}] ${event} event on ${table} table:`);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  console.log("---");
};

// HTTP client for sending events to analytical service
const sendEventToAnalytics = async (event: FooThingEvent | BarThingEvent) => {
  const analyticsUrl = ANALYTICS_BASE_URL;
  const endpoint = event.type === "foo.thing" ? "FooThingEvent" : "BarThingEvent";
  const url = `${analyticsUrl}/ingest/${endpoint}`;

  try {
    console.log(`📤 Sending ${event.type} event to analytics: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (response.ok) {
      console.log(`✅ Successfully sent ${event.type} event to analytics`);
    } else {
      console.error(`❌ Failed to send ${event.type} event to analytics:`, response.status, response.statusText);
      const errorText = await response.text();
      console.error("Response:", errorText);
    }
  } catch (error) {
    console.error(`❌ Error sending ${event.type} event to analytics:`, error);
  }
};

// HTTP client for sending data to Elasticsearch via retrieval service
const sendDataToElasticsearch = async (type: "foo" | "bar", action: "index" | "delete", data: any) => {
  console.log("Sending data to Elasticsearch:", type, action, data);
  const retrievalUrl = RETRIEVAL_BASE_URL;
  const url = `${retrievalUrl}/api/ingest/${type}`;

  try {
    console.log(`🔍 Sending ${type} ${action} to Elasticsearch: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, data }),
    });

    if (response.ok) {
      console.log(`✅ Successfully sent ${type} ${action} to Elasticsearch`);
    } else {
      console.error(`❌ Failed to send ${type} ${action} to Elasticsearch:`, response.status, response.statusText);
      const errorText = await response.text();
      console.error("Response:", errorText);
    }
  } catch (error) {
    console.error(`❌ Error sending ${type} ${action} to Elasticsearch:`, error);
  }
};

// Business logic handlers for each table
async function handleFooChange(payload: any) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  // Determine the action based on event type and changes
  let action: "created" | "updated" | "deleted" | "activated" | "deactivated";
  let changes: string[] = [];

  switch (eventType) {
    case "INSERT":
      action = "created";
      console.log(`🔔 Business Logic: New foo "${newRecord.name}" created`);
      break;
    case "UPDATE":
      // Determine specific update type
      if (oldRecord.isActive !== newRecord.isActive) {
        action = newRecord.isActive ? "activated" : "deactivated";
        console.log(
          `🔔 Business Logic: Foo "${newRecord.name}" ${action}`
        );
      } else {
        action = "updated";
        console.log(
          `🔔 Business Logic: Foo "${newRecord.name}" updated`
        );
      }
      
      // Track which fields changed
      changes = Object.keys(newRecord).filter(key => 
        JSON.stringify(oldRecord[key]) !== JSON.stringify(newRecord[key])
      );
      break;
    case "DELETE":
      action = "deleted";
      console.log(`🔔 Business Logic: Foo "${oldRecord.name}" was deleted`);
      break;
    default:
      console.warn(`Unknown event type: ${eventType}`);
      return;
  }

  // Create and send FooThingEvent to analytics
  try {
    // For INSERT events, create a default previous record with proper default values
    const createDefaultFooRecord = (record: any) => ({
      id: "",
      name: "",
      description: null,
      status: "active",
      priority: 0,
      isActive: false,
      metadata: {},
      tags: [],
      score: 0,
      largeText: "",
      createdAt: new Date(0), // Unix epoch
      updatedAt: new Date(0), // Unix epoch
      ...record
    });

    const fooEvent = createFooThingEvent({
      fooId: (newRecord?.id || oldRecord?.id) as string,
      action,
      previousData: oldRecord ? createDefaultFooRecord(oldRecord) : createDefaultFooRecord({}),
      currentData: newRecord ? createDefaultFooRecord(newRecord) : createDefaultFooRecord({}),
      changes,
    }, {
      source: "sync-base-realtime",
      correlationId: `foo-${payload.commit_timestamp || Date.now()}`,
      metadata: {
        session: "realtime-sync",
        user: "system"
      }
    });

    await sendEventToAnalytics(fooEvent);

    // Also send to Elasticsearch for search indexing
    if (eventType === "DELETE") {
      await sendDataToElasticsearch("foo", "delete", { id: oldRecord.id });
    } else {
      await sendDataToElasticsearch("foo", "index", newRecord);
    }
  } catch (error) {
    console.error("Error creating/sending FooThingEvent:", error);
  }
}

async function handleBarChange(payload: any) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  // Determine the action based on event type and changes
  let action: "created" | "updated" | "deleted" | "enabled" | "disabled";
  let changes: string[] = [];

  switch (eventType) {
    case "INSERT":
      action = "created";
      console.log(
        `🔔 Business Logic: New bar with value ${newRecord.value} created`
      );
      break;
    case "UPDATE":
      // Determine specific update type
      if (oldRecord.isEnabled !== newRecord.isEnabled) {
        action = newRecord.isEnabled ? "enabled" : "disabled";
        console.log(
          `🔔 Business Logic: Bar ${action}`
        );
      } else {
        action = "updated";
        console.log(
          `🔔 Business Logic: Bar updated`
        );
      }
      
      // Track which fields changed
      changes = Object.keys(newRecord).filter(key => 
        JSON.stringify(oldRecord[key]) !== JSON.stringify(newRecord[key])
      );
      break;
    case "DELETE":
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
    // For INSERT events, create a default previous record with proper default values
    const createDefaultBarRecord = (record: any) => ({
      id: "",
      fooId: "",
      value: 0,
      label: null,
      notes: null,
      isEnabled: false,
      createdAt: new Date(0), // Unix epoch
      updatedAt: new Date(0), // Unix epoch
      ...record
    });

    const barEvent = createBarThingEvent({
      barId: (newRecord?.id || oldRecord?.id) as string,
      fooId: (newRecord?.fooId || oldRecord?.fooId) as string,
      action,
      previousData: oldRecord ? createDefaultBarRecord(oldRecord) : createDefaultBarRecord({}),
      currentData: newRecord ? createDefaultBarRecord(newRecord) : createDefaultBarRecord({}),
      changes,
      value: newRecord?.value || oldRecord?.value,
    }, {
      source: "sync-base-realtime",
      correlationId: `bar-${payload.commit_timestamp || Date.now()}`,
      metadata: {
        session: "realtime-sync",
        user: "system"
      }
    });

    await sendEventToAnalytics(barEvent);

    // Also send to Elasticsearch for search indexing
    if (eventType === "DELETE") {
      await sendDataToElasticsearch("bar", "delete", { id: oldRecord.id });
    } else {
      await sendDataToElasticsearch("bar", "index", newRecord);
    }
  } catch (error) {
    console.error("Error creating/sending BarThingEvent:", error);
  }
}

function handleFooBarChange(payload: any) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  switch (eventType) {
    case "INSERT":
      console.log(
        `🔔 Business Logic: New foo-bar relationship created (${newRecord.relationship_type})`
      );
      // Add your sync logic here
      break;
    case "UPDATE":
      console.log(`🔔 Business Logic: Foo-bar relationship updated`);
      // Add your sync logic here
      break;
    case "DELETE":
      console.log(`🔔 Business Logic: Foo-bar relationship deleted`);
      // Add your sync logic here
      break;
  }
}

// Long-running Supabase listener task
export const supabaseListenerTask = new Task<null, void>("supabase-listener", {
  run: async () => {
    console.log("🚀 Starting Supabase realtime listener...");
    console.log("Reading configuration from environment variables...");

    // Debug environment variables
    console.log("Environment variables loaded:");
    console.log(
      "- SUPABASE_PUBLIC_URL:",
      process.env.SUPABASE_PUBLIC_URL || "NOT SET"
    );
    console.log(
      "- SERVICE_ROLE_KEY:",
      process.env.SERVICE_ROLE_KEY
        ? `${process.env.SERVICE_ROLE_KEY.substring(0, 20)}...`
        : "NOT SET"
    );
    console.log("- DB_SCHEMA:", process.env.DB_SCHEMA || "NOT SET");

    // Validate configuration with better error messages
    if (!config.supabaseUrl) {
      throw new Error(
        "SUPABASE_PUBLIC_URL environment variable is required but not provided"
      );
    }

    if (!config.supabaseKey || config.supabaseKey === "") {
      console.log(
        "⚠️  WARNING: SERVICE_ROLE_KEY environment variable is empty or not set"
      );
      console.log(
        "💡 Please set SERVICE_ROLE_KEY in your .env file from your transactional-base service"
      );
      console.log(
        "💡 You can find the SERVICE_ROLE_KEY in services/transactional-base/.env"
      );
      throw new Error("SERVICE_ROLE_KEY is required for Supabase connection");
    }

    if (!config.dbSchema) {
      throw new Error(
        "DB_SCHEMA environment variable is required but not provided"
      );
    }

    console.log("Configuration validated:");
    console.log("- supabaseUrl:", config.supabaseUrl);
    console.log("- schema:", config.dbSchema);
    console.log(
      "- hasValidKey:",
      config.supabaseKey && config.supabaseKey !== ""
    );

    // Create Supabase client
    console.log("🔧 Creating Supabase client...");
    const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    console.log("✅ Supabase client created successfully");

    // Set up a single channel for all table changes
    const channel = supabase
      .channel("db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: config.dbSchema,
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
          schema: config.dbSchema,
          table: "bar",
        },
        async (payload) => {
          logEvent("BAR CHANGE", "bar", payload);
          await handleBarChange(payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: config.dbSchema,
          table: "foo_bar",
        },
        (payload) => {
          logEvent("FOO_BAR CHANGE", "foo_bar", payload);
          handleFooBarChange(payload);
        }
      )
      .subscribe((status, error) => {
        console.log(`✅ Database changes listener status: ${status}`);
        if (error) {
          console.error("Subscription error:", error);
        }
        if (status === "SUBSCRIBED") {
          console.log("🎉 Successfully connected to all database tables!");
          console.log("   - foo table: ✅");
          console.log("   - bar table: ✅");
          console.log("   - foo_bar table: ✅");
        } else if (status === "CLOSED") {
          console.log("❌ Connection to database tables closed");
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
    console.log("Listening for changes on tables: foo, bar, foo_bar");
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
