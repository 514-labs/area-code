import { readFileSync } from "fs";
import { join } from "path";
import { executeSQL, PostgresClient } from "./postgres-client";
import { SupabaseClient } from "@supabase/supabase-js";

export async function setupRealtimeReplication(
  pgClient: PostgresClient
): Promise<void> {
  const sqlScriptPath = join(__dirname, "setup-realtime-replication.sql");
  const sqlScript = readFileSync(sqlScriptPath, "utf-8");

  await executeSQL(pgClient, sqlScript);

  console.log("✅ Realtime replication setup complete");
}

export async function disableRealtimeReplication(
  supabaseClient: SupabaseClient
): Promise<void> {
  try {
    const result = await supabaseClient.rpc("disable_realtime_replication");
    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    // Fallback to direct SQL via executeComplexSQL (more reliable)
    console.log("🔄 Using direct SQL method...");
    console.log("   Reason:", error instanceof Error ? error.message : error);
    await this.executeComplexSQL(`
      DROP PUBLICATION IF EXISTS supabase_realtime;
      CREATE PUBLICATION supabase_realtime;
    `);
    console.log("✅ Realtime replication disabled via direct SQL");
  }
}
