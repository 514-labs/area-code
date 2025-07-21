import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { config as dotenvConfig } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment detection - default to CLI for development
const isSupabaseCLI =
  process.env.SUPABASE_CLI === "true" ||
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV !== "production";

// Load environment variables based on setup
if (isSupabaseCLI) {
  console.log("🚀 Using Supabase CLI for development");
  // CLI uses default connection strings, minimal env needed
  dotenvConfig({ path: path.resolve(__dirname, "../../.env") });
} else {
  console.log("🏭 Using production database setup");
  // Load from the transactional-database service .env file
  dotenvConfig({
    path: path.resolve(__dirname, "../../../transactional-database/prod/.env"),
  });
  // Also load local .env if it exists (for app-specific overrides)
  dotenvConfig({ path: path.resolve(__dirname, "../../.env") });
}

// Database connection configuration
let connectionString: string;

if (isSupabaseCLI) {
  // Supabase CLI standard connection strings
  const isMigrationScript = process.argv.some((arg) => arg.includes("migrate"));

  if (isMigrationScript) {
    // Direct connection to CLI database for migrations
    connectionString =
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    console.log("🔗 Connecting to Supabase CLI database (migrations)");
  } else {
    // Runtime connection through CLI API
    connectionString =
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    console.log("🔗 Connecting to Supabase CLI database (runtime)");
  }
} else {
  // Production setup with Supavisor
  const password =
    process.env.POSTGRES_PASSWORD ||
    "your-super-secret-and-long-postgres-password";
  const tenantId = process.env.POOLER_TENANT_ID || "dev";
  const isMigrationScript = process.argv.some((arg) => arg.includes("migrate"));

  const DIRECT_PORT = process.env.POSTGRES_PORT || "5432";
  const POOLER_PORT = process.env.POOLER_PROXY_PORT_TRANSACTION || "6543";

  connectionString = isMigrationScript
    ? `postgresql://postgres.${tenantId}:${password}@localhost:${DIRECT_PORT}/postgres`
    : `postgresql://postgres.${tenantId}:${password}@localhost:${POOLER_PORT}/postgres`;

  const userType = `postgres.${tenantId}`;
  const portType = isMigrationScript
    ? "Supavisor session mode (5432)"
    : "Supavisor transaction mode (6543)";

  console.log(`🔗 Connecting as ${userType} via ${portType} connection`);
  console.log(`🏗️  Database service: transactional-database`);
}

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

export { pool };
