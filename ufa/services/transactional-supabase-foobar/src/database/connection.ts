import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { config as dotenvConfig } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment detection
const isSupabaseCLI = process.env.SUPABASE_CLI === "true";
const isProduction = process.env.NODE_ENV === "production";
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

// Load environment variables based on setup
if (isSupabaseCLI || process.env.NODE_ENV === "development") {
  console.log("🚀 Using Supabase CLI for development");
  // CLI uses default connection strings, minimal env needed
  dotenvConfig({ path: path.resolve(__dirname, "../../.env") });
} else if (isGitHubActions) {
  console.log("🤖 Running in GitHub Actions - using DATABASE_URL directly");
  // In GitHub Actions, environment variables are provided directly
  // No need to load from files
} else {
  console.log("🏭 Using production database setup");
  // Load from the transactional-supabase-foobar service .env file
  dotenvConfig({
    path: path.resolve(
      __dirname,
      "../../../transactional-supabase-foobar/database/prod/.env"
    ),
  });
  // Also load local .env if it exists (for app-specific overrides)
  dotenvConfig({ path: path.resolve(__dirname, "../../.env") });
}

// Database connection configuration
let connectionString: string;

if (isSupabaseCLI || process.env.NODE_ENV === "development") {
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
} else if (isGitHubActions || (isProduction && process.env.DATABASE_URL)) {
  // GitHub Actions or production with DATABASE_URL provided
  connectionString = process.env.DATABASE_URL!;
  console.log("🔗 Connecting to hosted Supabase database");
  if (isGitHubActions) {
    console.log("🤖 Running migration in GitHub Actions");
  }
} else {
  throw new Error("No database connection string provided");
}

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

export { pool };
