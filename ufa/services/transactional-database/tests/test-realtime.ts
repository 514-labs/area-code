#!/usr/bin/env tsx

/**
 * Supabase Realtime Test Script
 *
 * This script tests the Realtime functionality of a self-hosted Supabase instance.
 * It demonstrates:
 * 1. Connecting to the Realtime service
 * 2. Subscribing to database changes
 * 3. Listening for INSERT, UPDATE, and DELETE events
 * 4. Broadcasting custom messages
 * 5. Presence tracking
 *
 * Usage:
 *   pnpm test:realtime:dev
 *   or
 *   pnpm build && pnpm test:realtime
 */

import { RealtimeClient, RealtimeChannel } from "@supabase/realtime-js";
import WebSocket from "ws";
import { config as dotenvConfig } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the prod directory
dotenvConfig({ path: path.resolve(__dirname, "../prod/.env") });

// Configuration - Update these values based on your .env file
const config = {
  realtimeUrl: process.env.REALTIME_URL || "ws://localhost:8000/realtime/v1",
  apiKey: process.env.ANON_KEY || "your-anon-key-here",
  schema: process.env.DB_SCHEMA || "public",
  table: process.env.TEST_TABLE || "test_table",
  userId:
    process.env.USER_ID || `user_${Math.random().toString(36).substr(2, 9)}`,
};

// Global WebSocket for Node.js environment
(global as any).WebSocket = WebSocket;

class RealtimeTest {
  private client: RealtimeClient;
  private channel: RealtimeChannel | null = null;
  private isConnected = false;

  constructor() {
    console.log("🚀 Initializing Realtime Test Script");
    console.log("📡 Realtime URL:", config.realtimeUrl);
    console.log("🔑 Using API Key:", config.apiKey.substring(0, 20) + "...");
    console.log("📊 Schema:", config.schema);
    console.log("📋 Table:", config.table);
    console.log("👤 User ID:", config.userId);
    console.log("");

    // Initialize Realtime client
    this.client = new RealtimeClient(config.realtimeUrl, {
      params: {
        apikey: config.apiKey,
        vsn: "1.0.0",
      },
      heartbeatIntervalMs: 30000,
      reconnectAfterMs: (tries: number) => {
        return [1000, 2000, 5000, 10000][tries - 1] || 10000;
      },
      logger: (kind: string, msg: string, data?: any) => {
        if (kind === "error") {
          console.error(`❌ Realtime ${kind}:`, msg, data);
        } else {
          console.log(`📡 Realtime ${kind}:`, msg);
        }
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Connection events will be handled through channel subscription
    console.log("📡 Event handlers setup complete");
  }

  private async startTests(): Promise<void> {
    console.log("\n🧪 Starting Realtime tests...\n");

    try {
      // Test 1: Database Changes Subscription
      await this.testDatabaseChanges();

      // Test 2: Broadcast Messages
      await this.testBroadcast();

      // Test 3: Presence Tracking
      await this.testPresence();

      console.log("\n✅ All tests completed successfully!");
      console.log(
        "🔍 Monitor your database and check the console for real-time updates."
      );
      console.log("💡 Try making changes to the database to see live updates.");
      console.log("\n📝 To stop the test, press Ctrl+C");
    } catch (error) {
      console.error("❌ Test failed:", error);
      this.disconnect();
    }
  }

  private async testDatabaseChanges(): Promise<void> {
    console.log("🔄 Test 1: Database Changes Subscription");

    const channelName = `${config.schema}:${config.table}`;
    this.channel = this.client.channel(channelName);

    // Subscribe to all changes on the table
    this.channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: config.schema,
          table: config.table,
        },
        (payload) => {
          console.log("📥 Database change received:", {
            event: payload.eventType,
            table: payload.table,
            schema: payload.schema,
            new: payload.new,
            old: payload.old,
            timestamp: new Date().toISOString(),
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: config.schema,
          table: config.table,
        },
        (payload) => {
          console.log("➕ INSERT event:", payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: config.schema,
          table: config.table,
        },
        (payload) => {
          console.log("✏️  UPDATE event:", {
            old: payload.old,
            new: payload.new,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: config.schema,
          table: config.table,
        },
        (payload) => {
          console.log("🗑️  DELETE event:", payload.old);
        }
      );

    const subscriptionResponse = await this.channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("✅ Successfully subscribed to database changes");
        console.log(
          `📋 Listening for changes on ${config.schema}.${config.table}`
        );
        console.log("💡 Try running SQL commands like:");
        console.log(`   INSERT INTO ${config.table} (name) VALUES ('test');`);
        console.log(
          `   UPDATE ${config.table} SET name = 'updated' WHERE id = 1;`
        );
        console.log(`   DELETE FROM ${config.table} WHERE id = 1;`);
      } else if (status === "CHANNEL_ERROR") {
        console.error("❌ Failed to subscribe to database changes");
      }
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("✅ Database changes test setup complete\n");
        resolve();
      }, 1000);
    });
  }

  private async testBroadcast(): Promise<void> {
    console.log("📢 Test 2: Broadcast Messages");

    if (!this.channel) {
      console.error("❌ No channel available for broadcast test");
      return;
    }

    // Listen for broadcast messages
    this.channel.on("broadcast", { event: "test-message" }, (payload) => {
      console.log("📨 Broadcast message received:", payload);
    });

    // Send a test broadcast message
    const testMessage = {
      type: "test",
      message: "Hello from Realtime test!",
      timestamp: new Date().toISOString(),
      userId: config.userId,
    };

    const broadcastResponse = await this.channel.send({
      type: "broadcast",
      event: "test-message",
      payload: testMessage,
    });

    if (broadcastResponse === "ok") {
      console.log("✅ Broadcast message sent successfully");
    } else {
      console.error("❌ Failed to send broadcast message");
    }

    console.log("✅ Broadcast test complete\n");
  }

  private async testPresence(): Promise<void> {
    console.log("👥 Test 3: Presence Tracking");

    if (!this.channel) {
      console.error("❌ No channel available for presence test");
      return;
    }

    // Track presence
    const presenceState = {
      user_id: config.userId,
      online_at: new Date().toISOString(),
      status: "testing",
    };

    this.channel.on("presence", { event: "sync" }, () => {
      const state = this.channel!.presenceState();
      console.log(
        "👥 Presence sync:",
        Object.keys(state).length,
        "users online"
      );
      Object.entries(state).forEach(([key, presence]) => {
        console.log(`   👤 ${key}:`, presence);
      });
    });

    this.channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
      console.log("👋 User joined:", key, newPresences);
    });

    this.channel.on(
      "presence",
      { event: "leave" },
      ({ key, leftPresences }) => {
        console.log("👋 User left:", key, leftPresences);
      }
    );

    // Track our presence
    const trackResponse = await this.channel.track(presenceState);

    if (trackResponse === "ok") {
      console.log("✅ Presence tracking started");
    } else {
      console.error("❌ Failed to start presence tracking", trackResponse);
    }

    console.log("✅ Presence test complete\n");
  }

  public connect(): void {
    console.log("🔌 Connecting to Realtime server...");
    this.client.connect();
    // Start tests immediately since we don't have connection events
    this.startTests();
  }

  public disconnect(): void {
    console.log("🔌 Disconnecting from Realtime server...");
    if (this.channel) {
      this.channel.unsubscribe();
    }
    this.client.disconnect();
    process.exit(0);
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Main execution
async function main() {
  // Validate configuration
  if (config.apiKey === "your-anon-key-here") {
    console.error(
      "❌ Please set your ANON_KEY in the .env file or environment variables"
    );
    console.log("💡 Run: node generate-jwt.js to generate API keys");
    process.exit(1);
  }

  const realtimeTest = new RealtimeTest();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down gracefully...");
    realtimeTest.disconnect();
  });

  process.on("SIGTERM", () => {
    console.log("\n🛑 Received SIGTERM, shutting down...");
    realtimeTest.disconnect();
  });

  // Start the test
  realtimeTest.connect();

  // Keep the process alive
  setInterval(() => {
    if (!realtimeTest.getConnectionStatus()) {
      console.log("⚠️  Connection lost, attempting to reconnect...");
    }
  }, 30000);
}

// Run the test
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
