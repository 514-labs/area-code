import { Task, Workflow } from "@514labs/moose-lib";
import { handleFooChange } from "./handle-foo-change";
import { handleBarChange } from "./handle-bar.change";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  createSupabaseClient,
  SupabaseConfig,
  checkDatabaseConnection,
} from "../../supabase/supabase-client";
import {
  createProgresClient,
  PostgresClient,
} from "../../supabase/postgres-client";
import {
  disableRealtimeReplication,
  setupRealtimeReplication,
} from "../../supabase/realtime-replication";

let registeredChannels: any = null;

async function registerSupabaseCDCListeners(
  supabaseClient: SupabaseClient,
  supabaseConfig: SupabaseConfig
) {
  console.log("🔄 Setting up realtime listeners...");

  const channel = supabaseClient
    .channel("db-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: supabaseConfig.dbSchema,
        table: "foo",
      },
      async (payload) => {
        console.log("FOO CHANGE CAPTURED");
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
        console.log("BAR CHANGE CAPTURED");
        await handleBarChange(payload);
      }
    )
    .subscribe((status, error) => {
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
          console.error("- Full error object:", JSON.stringify(error, null, 2));
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

  // Store channel reference for cleanup
  registeredChannels = channel;

  // Handle graceful shutdown
  const cleanup = async () => {
    console.log("\n🔄 Process signal received - running full cleanup...");

    await onCancel();

    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  console.log("\n🎯 Supabase realtime listeners are now active!");

  // Keep the task running indefinitely
  return new Promise<void>(() => {
    // This promise never resolves, keeping the task alive
    // The task will only end when the workflow is terminated
  });
}

async function cleanupSupabaseCDCListeners() {
  console.log("📡 Unsubscribing from Supabase realtime channel...");

  if (!registeredChannels) {
    console.log("ℹ️  No active Supabase channel to clean up");
    return;
  }

  try {
    await registeredChannels.unsubscribe();
    console.log("✅ Successfully unsubscribed from Supabase realtime channel");
    registeredChannels = null;
  } catch (error) {
    console.error("❌ Error during Supabase channel cleanup:", error);
  }
}

async function cleanupRealtimeReplication(pgClient: PostgresClient) {
  console.log("🛑 Disabling realtime replication...");

  try {
    await disableRealtimeReplication(pgClient);
    console.log("✅ Realtime replication disabled");
  } catch (error) {
    console.error("❌ Error during realtime replication cleanup:", error);
  }
}

async function onCancel() {
  console.log(
    "🛑 Workflow cancellation requested - cleaning up Supabase subscriptions..."
  );

  const pgClient = createProgresClient();

  await cleanupSupabaseCDCListeners();
  await cleanupRealtimeReplication(pgClient);

  console.log("🧹 Cleanup complete - all resources released");
}

async function waitForSupabase(supabaseClient: SupabaseClient) {
  console.log("🔄 Waiting for Supabase...");

  const startTime = Date.now();
  const timeoutMs = 300000; // 5 minutes

  while (Date.now() - startTime < timeoutMs) {
    if (await checkDatabaseConnection(supabaseClient)) {
      console.log("✅ Supabase connected");
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Check if we timed out
  if (Date.now() - startTime >= timeoutMs) {
    throw new Error("❌ Timeout waiting for Supabase");
  }
}

async function waitForRealtimeService(supabaseConfig: SupabaseConfig) {
  console.log("🔄 Waiting for realtime service...");

  const realtimeStartTime = Date.now();
  const realtimeTimeoutMs = 300000; // 5 minutes for realtime

  while (Date.now() - realtimeStartTime < realtimeTimeoutMs) {
    try {
      const realtimeUrl = `${supabaseConfig.supabaseUrl}/realtime/v1/websocket?apikey=${supabaseConfig.supabaseKey}`;
      const testResponse = await fetch(realtimeUrl);

      // For WebSocket endpoints, getting a 426 "Upgrade Required" or similar is actually good
      // It means the endpoint exists and is responding
      if (
        testResponse.status === 426 ||
        testResponse.status === 400 ||
        testResponse.ok
      ) {
        console.log(
          "✅ Realtime service ready (status:",
          testResponse.status,
          ")"
        );
        break;
      }
    } catch (error) {
      console.log(
        "🔄 Realtime service check failed:",
        (error as Error).message
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 5000)); // Check every 5 seconds
  }
}

async function workflowSetup(
  supabaseClient: SupabaseClient,
  supabaseConfig: SupabaseConfig
) {
  const pgClient = createProgresClient();

  await waitForSupabase(supabaseClient);
  await waitForRealtimeService(supabaseConfig);

  await setupRealtimeReplication(pgClient);
}

async function taskExecution() {
  const { client, config } = createSupabaseClient();

  await workflowSetup(client, config);
  await registerSupabaseCDCListeners(client, config);
}

// Long-running Supabase listener task
export const supabaseCDCTask = new Task<null, void>("supabase-listener", {
  run: taskExecution,
  onCancel,
  // Set a longer timeout for the long-running task
  timeout: "24h",
});

// Create the workflow with the combined task
export const supabaseCDCWorkflow = new Workflow("supabase-listener", {
  startingTask: supabaseCDCTask,
  // Run indefinitely until manually stopped
  timeout: "24h",
});
