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
  supabaseKey: process.env.ANON_KEY || "",
  dbSchema: process.env.DB_SCHEMA || "public",
};

// Enhanced logging function
const logEvent = (event: string, table: string, payload: any) => {
  const timestamp = new Date().toISOString();
  console.error(`\n[${timestamp}] ${event} event on ${table} table:`);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  console.log("---");
};

// Business logic handlers for each table
function handleFooChange(payload: any) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  switch (eventType) {
    case "INSERT":
      console.log(`🔔 Business Logic: New foo "${newRecord.name}" created`);
      // Add your sync logic here
      break;
    case "UPDATE":
      if (oldRecord.status !== newRecord.status) {
        console.log(
          `🔔 Business Logic: Foo "${newRecord.name}" status changed from "${oldRecord.status}" to "${newRecord.status}"`
        );
      }
      // Add your sync logic here
      break;
    case "DELETE":
      console.log(`🔔 Business Logic: Foo "${oldRecord.name}" was deleted`);
      // Add your sync logic here
      break;
  }
}

function handleBarChange(payload: any) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  switch (eventType) {
    case "INSERT":
      console.log(
        `🔔 Business Logic: New bar with value ${newRecord.value} created`
      );
      // Add your sync logic here
      break;
    case "UPDATE":
      if (oldRecord.value !== newRecord.value) {
        console.log(
          `🔔 Business Logic: Bar value changed from ${oldRecord.value} to ${newRecord.value}`
        );
      }
      // Add your sync logic here
      break;
    case "DELETE":
      console.log(
        `🔔 Business Logic: Bar with value ${oldRecord.value} was deleted`
      );
      // Add your sync logic here
      break;
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
      "- ANON_KEY:",
      process.env.ANON_KEY
        ? `${process.env.ANON_KEY.substring(0, 20)}...`
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
        "⚠️  WARNING: ANON_KEY environment variable is empty or not set"
      );
      console.log(
        "💡 Please set ANON_KEY in your .env file from your transactional-base service"
      );
      console.log(
        "💡 You can find the ANON_KEY in services/transactional-base/.env"
      );
      throw new Error("ANON_KEY is required for Supabase connection");
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
        (payload) => {
          logEvent("FOO CHANGE", "foo", payload);
          handleFooChange(payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: config.dbSchema,
          table: "bar",
        },
        (payload) => {
          logEvent("BAR CHANGE", "bar", payload);
          handleBarChange(payload);
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

// TODO: Refactor so postgres sync is separate and gets exported here
export * from "./s3";