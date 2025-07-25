import type { Config } from "drizzle-kit";
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
  // CLI uses default connection strings, minimal env needed
  dotenvConfig({ path: path.resolve(__dirname, ".env") });
} else {
  // Load from the transactional-database service .env file
  dotenvConfig({
    path: path.resolve(__dirname, "../transactional-database/prod/.env"),
  });
  // Also load local .env if it exists (for app-specific overrides)
  dotenvConfig({ path: path.resolve(__dirname, ".env") });
}

// Database connection configuration
let connectionString: string;

if (isSupabaseCLI) {
  // Supabase CLI default connection for migrations
  connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
} else {
  // Production setup with Supavisor session mode for migrations
  const password =
    process.env.POSTGRES_PASSWORD ||
    "your-super-secret-and-long-postgres-password";
  const tenantId = process.env.POOLER_TENANT_ID || "dev";
  connectionString = `postgresql://postgres.${tenantId}:${password}@localhost:5432/postgres`;
}

export default {
  schema: "./src/database/schema.ts",
  out: "./migrations",
  driver: "pg",
  dbCredentials: {
    connectionString,
  },
} satisfies Config;
