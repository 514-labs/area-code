import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_PUBLIC_URL || "http://localhost:8000",
  supabaseAnonKey: process.env.ANON_KEY || "",
  serviceRoleKey: process.env.SERVICE_ROLE_KEY || "",
  dbSchema: process.env.DB_SCHEMA || "public",
};

// Create Supabase client for listening
const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

// Create Supabase client for operations (with service role key)
const serviceClient = createClient(config.supabaseUrl, config.serviceRoleKey);

console.log("🚀 Simple Realtime Test - Listening to foo table changes...");
console.log("Configuration:", {
  supabaseUrl: config.supabaseUrl,
  schema: config.dbSchema,
});

// Simple listener for foo table
const channel = supabase
  .channel("simple-foo-changes")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: config.dbSchema,
      table: "foo",
    },
    (payload) => {
      console.log("\n🎉 REALTIME EVENT RECEIVED!");
      console.log("Event Type:", payload.eventType);
      console.log("Table:", payload.table);
      console.log("Timestamp:", new Date().toISOString());

      if (payload.eventType === "INSERT") {
        console.log("✅ NEW RECORD:", payload.new);
      } else if (payload.eventType === "UPDATE") {
        console.log("📝 OLD RECORD:", payload.old);
        console.log("📝 NEW RECORD:", payload.new);
      } else if (payload.eventType === "DELETE") {
        console.log("🗑️ DELETED RECORD:", payload.old);
      }
      console.log("-".repeat(50));
    }
  )
  .subscribe((status) => {
    console.log(`📡 Subscription status: ${status}`);

    if (status === "SUBSCRIBED") {
      console.log("✅ Successfully subscribed to foo table changes!");
      console.log("Now creating test data...\n");

      // Wait a moment, then create test data
      setTimeout(async () => {
        console.log("🧪 Creating test foo record...");

        const { data, error } = await serviceClient
          .from("foo")
          .insert({
            name: "Simple Test Foo",
            description: "Testing simple realtime functionality",
            status: "active",
            priority: 1,
          })
          .select();

        if (error) {
          console.error("❌ Error creating test record:", error);
        } else {
          console.log("✅ Test record created:", data[0]);

          // Wait a moment, then update the record
          setTimeout(async () => {
            console.log("\n🧪 Updating test foo record...");

            const { data: updateData, error: updateError } = await serviceClient
              .from("foo")
              .update({ status: "inactive" })
              .eq("id", data[0].id)
              .select();

            if (updateError) {
              console.error("❌ Error updating test record:", updateError);
            } else {
              console.log("✅ Test record updated:", updateData[0]);

              // Wait a moment, then delete the record
              setTimeout(async () => {
                console.log("\n🧪 Deleting test foo record...");

                const { error: deleteError } = await serviceClient
                  .from("foo")
                  .delete()
                  .eq("id", data[0].id);

                if (deleteError) {
                  console.error("❌ Error deleting test record:", deleteError);
                } else {
                  console.log("✅ Test record deleted");

                  // Wait a moment, then cleanup
                  setTimeout(() => {
                    console.log(
                      "\n🎯 Simple realtime test completed successfully!"
                    );
                    console.log(
                      "You should have seen 3 realtime events: INSERT, UPDATE, DELETE"
                    );
                    console.log("Press Ctrl+C to exit...");
                  }, 1000);
                }
              }, 2000);
            }
          }, 2000);
        }
      }, 2000);
    }
  });

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down gracefully...");
  channel.unsubscribe();
  process.exit(0);
});

// Keep the process running
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  channel.unsubscribe();
  process.exit(1);
});

console.log("Press Ctrl+C to stop the test...");
