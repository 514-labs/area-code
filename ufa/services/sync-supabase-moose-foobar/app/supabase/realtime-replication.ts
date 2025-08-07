import { readFileSync } from "fs";
import { join } from "path";
import { executeSQL, PostgresClient } from "./postgres-client";

export async function setupRealtimeReplication(
  pgClient: PostgresClient
): Promise<void> {
  const sqlScriptPath = join(__dirname, "setup-realtime-replication.sql");
  const sqlScript = readFileSync(sqlScriptPath, "utf-8");

  await executeSQL(pgClient, sqlScript);

  console.log("✅ Realtime replication setup complete");
}

export async function disableRealtimeReplication(
  pgClient: PostgresClient
): Promise<void> {
  try {
    await executeSQL(
      pgClient,
      `
      DROP PUBLICATION IF EXISTS supabase_realtime;
      CREATE PUBLICATION supabase_realtime;
    `
    );

    console.log("✅ Realtime replication disabled");
  } catch (error) {
    console.error("❌ Error during realtime replication cleanup:", error);
  }
}
