import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_PUBLIC_URL || "http://localhost:8000",
  supabaseAnonKey: process.env.ANON_KEY || "",
  serviceRoleKey: process.env.SERVICE_ROLE_KEY || "",
  realtimeUrl: process.env.REALTIME_URL || "ws://localhost:8000/realtime/v1",
  dbSchema: process.env.DB_SCHEMA || "public",
};

// Create Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Enhanced logging function
const logEvent = (event: string, table: string, payload: any) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${event} event on ${table} table:`);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  console.log("---");
};

// Test class for managing realtime subscriptions
class PostgresChangesTest {
  private channels: any[] = [];
  private isRunning = false;

  constructor() {
    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("\nShutting down gracefully...");
      this.cleanup();
      process.exit(0);
    });
  }

  // Set up all table listeners
  async setupListeners() {
    console.log("Setting up PostgreSQL changes listeners...");
    console.log("Configuration:", {
      supabaseUrl: config.supabaseUrl,
      realtimeUrl: config.realtimeUrl,
      schema: config.dbSchema,
    });

    // Listen to all changes on foo table
    this.setupFooTableListener();

    // Listen to all changes on bar table
    this.setupBarTableListener();

    // Listen to specific foo table events
    this.setupFooSpecificEvents();

    // Listen to specific bar table events
    this.setupBarSpecificEvents();

    // Listen to filtered changes
    this.setupFilteredListeners();

    this.isRunning = true;
    console.log("\n✅ All listeners are now active!");
    console.log(
      "Make changes to the foo and bar tables to see realtime updates..."
    );
  }

  // Listen to all changes on foo table
  private setupFooTableListener() {
    const fooChannel = supabase
      .channel("foo-all-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: config.dbSchema,
          table: "foo",
        },
        (payload) => {
          logEvent("ALL CHANGES", "foo", payload);
          this.handleFooChange(payload);
        }
      )
      .subscribe((status) => {
        console.log(`Foo table listener status: ${status}`);
      });

    this.channels.push(fooChannel);
  }

  // Listen to all changes on bar table
  private setupBarTableListener() {
    const barChannel = supabase
      .channel("bar-all-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: config.dbSchema,
          table: "bar",
        },
        (payload) => {
          logEvent("ALL CHANGES", "bar", payload);
          this.handleBarChange(payload);
        }
      )
      .subscribe((status) => {
        console.log(`Bar table listener status: ${status}`);
      });

    this.channels.push(barChannel);
  }

  // Listen to specific foo table events (INSERT, UPDATE, DELETE)
  private setupFooSpecificEvents() {
    const fooSpecificChannel = supabase
      .channel("foo-specific-events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: config.dbSchema,
          table: "foo",
        },
        (payload) => {
          logEvent("INSERT", "foo", payload);
          console.log("🆕 New foo record created:", payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: config.dbSchema,
          table: "foo",
        },
        (payload) => {
          logEvent("UPDATE", "foo", payload);
          console.log("📝 Foo record updated:");
          console.log("Old:", payload.old);
          console.log("New:", payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: config.dbSchema,
          table: "foo",
        },
        (payload) => {
          logEvent("DELETE", "foo", payload);
          console.log("🗑️ Foo record deleted:", payload.old);
        }
      )
      .subscribe((status) => {
        console.log(`Foo specific events listener status: ${status}`);
      });

    this.channels.push(fooSpecificChannel);
  }

  // Listen to specific bar table events (INSERT, UPDATE, DELETE)
  private setupBarSpecificEvents() {
    const barSpecificChannel = supabase
      .channel("bar-specific-events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: config.dbSchema,
          table: "bar",
        },
        (payload) => {
          logEvent("INSERT", "bar", payload);
          console.log("🆕 New bar record created:", payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: config.dbSchema,
          table: "bar",
        },
        (payload) => {
          logEvent("UPDATE", "bar", payload);
          console.log("📝 Bar record updated:");
          console.log("Old:", payload.old);
          console.log("New:", payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: config.dbSchema,
          table: "bar",
        },
        (payload) => {
          logEvent("DELETE", "bar", payload);
          console.log("🗑️ Bar record deleted:", payload.old);
        }
      )
      .subscribe((status) => {
        console.log(`Bar specific events listener status: ${status}`);
      });

    this.channels.push(barSpecificChannel);
  }

  // Listen to filtered changes (e.g., only active foo records)
  private setupFilteredListeners() {
    // Listen to foo records with status = 'active'
    const fooActiveChannel = supabase
      .channel("foo-active-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: config.dbSchema,
          table: "foo",
          filter: "status=eq.active",
        },
        (payload) => {
          logEvent("ACTIVE FOO CHANGES", "foo", payload);
          console.log("🔥 Active foo record changed:", payload);
        }
      )
      .subscribe((status) => {
        console.log(`Foo active filter listener status: ${status}`);
      });

    // Listen to bar records with high values (> 100)
    const barHighValueChannel = supabase
      .channel("bar-high-value-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: config.dbSchema,
          table: "bar",
          filter: "value=gt.100",
        },
        (payload) => {
          logEvent("HIGH VALUE BAR CHANGES", "bar", payload);
          console.log("💰 High value bar record changed:", payload);
        }
      )
      .subscribe((status) => {
        console.log(`Bar high value filter listener status: ${status}`);
      });

    this.channels.push(fooActiveChannel, barHighValueChannel);
  }

  // Handle foo table changes with business logic
  private handleFooChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case "INSERT":
        console.log(`🔔 Business Logic: New foo "${newRecord.name}" created`);
        break;
      case "UPDATE":
        if (oldRecord.status !== newRecord.status) {
          console.log(
            `🔔 Business Logic: Foo "${newRecord.name}" status changed from "${oldRecord.status}" to "${newRecord.status}"`
          );
        }
        break;
      case "DELETE":
        console.log(`🔔 Business Logic: Foo "${oldRecord.name}" was deleted`);
        break;
    }
  }

  // Handle bar table changes with business logic
  private handleBarChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case "INSERT":
        console.log(
          `🔔 Business Logic: New bar with value ${newRecord.value} created`
        );
        break;
      case "UPDATE":
        if (oldRecord.value !== newRecord.value) {
          console.log(
            `🔔 Business Logic: Bar value changed from ${oldRecord.value} to ${newRecord.value}`
          );
        }
        break;
      case "DELETE":
        console.log(
          `🔔 Business Logic: Bar with value ${oldRecord.value} was deleted`
        );
        break;
    }
  }

  // Test helper methods to trigger changes
  async testInsertOperations() {
    console.log("\n🧪 Testing INSERT operations...");

    // Create a service role client for testing operations
    const testClient = createClient(config.supabaseUrl, config.serviceRoleKey);

    try {
      // Insert a foo record
      const { data: fooData, error: fooError } = await testClient
        .from("foo")
        .insert({
          name: "Test Foo",
          description: "Test foo description",
          status: "active",
          priority: 1,
        })
        .select();

      if (fooError) {
        console.error("Error inserting foo:", fooError);
        return;
      }

      console.log("✅ Inserted foo record:", fooData);

      // Insert a bar record
      const { data: barData, error: barError } = await testClient
        .from("bar")
        .insert({
          fooId: fooData[0].id,
          value: 150,
          label: "Test Bar",
          notes: "Test bar notes",
        })
        .select();

      if (barError) {
        console.error("Error inserting bar:", barError);
        return;
      }

      console.log("✅ Inserted bar record:", barData);
    } catch (error) {
      console.error("Error in test operations:", error);
    }
  }

  // Clean up subscriptions
  cleanup() {
    console.log("Cleaning up subscriptions...");
    this.isRunning = false;

    this.channels.forEach((channel) => {
      if (channel) {
        channel.unsubscribe();
      }
    });

    this.channels = [];
    console.log("✅ Cleanup complete");
  }

  // Get connection status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeChannels: this.channels.length,
      supabaseUrl: config.supabaseUrl,
    };
  }
}

// Main execution function
async function main() {
  console.log("🚀 Starting PostgreSQL Changes Test for Foo and Bar Tables");
  console.log("=".repeat(60));

  // Validate configuration
  if (!config.supabaseAnonKey) {
    console.error(
      "❌ Error: ANON_KEY is required. Please check your .env file"
    );
    process.exit(1);
  }

  const test = new PostgresChangesTest();

  try {
    await test.setupListeners();

    // Wait a bit for connections to establish
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Optionally run test operations
    if (process.argv.includes("--test-insert")) {
      await test.testInsertOperations();
    }

    console.log("\n📊 Test Status:", test.getStatus());
    console.log("\n💡 Tips:");
    console.log("- Use the API endpoints to create/update/delete records");
    console.log(
      "- Run with --test-insert flag to automatically create test records"
    );
    console.log("- Press Ctrl+C to stop the test");

    // Keep the process running
    await new Promise(() => {});
  } catch (error) {
    console.error("❌ Error starting test:", error);
    test.cleanup();
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { PostgresChangesTest };
