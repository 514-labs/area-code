import { Client } from "pg";
import { getSupabaseConnectionString, isProduction } from "../env-vars";

export type PostgresClient = Client;

export function createProgresClient(): PostgresClient {
  const connectionString = getSupabaseConnectionString();
  return new Client({
    connectionString,
    ssl: isProduction() ? { rejectUnauthorized: false } : false,
  });
}

export async function executeSQL(
  pgClient: PostgresClient,
  sqlScript: string
): Promise<void> {
  const cleanedSQL = sqlScript
    .replace(/\\set\s+.*$/gm, "") // Remove \set commands
    .replace(/^\s*--.*$/gm, "") // Remove comment-only lines
    .trim();

  if (!cleanedSQL) {
    throw new Error("No SQL content to execute after cleanup");
  }

  try {
    await pgClient.connect();
    await pgClient.query(cleanedSQL);
  } catch (error) {
    console.error("❌ Error executing SQL script:", error);
    throw error;
  } finally {
    await pgClient.end();
  }
}
