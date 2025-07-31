import type { Config } from "drizzle-kit";
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
  // CLI uses default connection strings, minimal env needed
  dotenvConfig({ path: path.resolve(__dirname, ".env") });
} else if (isGitHubActions) {
  console.log("🤖 Running in GitHub Actions - using DATABASE_URL directly");
  // In GitHub Actions, environment variables are provided directly
} else if (isProduction) {
  console.log("🏭 Production setup - using DATABASE_URL from environment");
  // Load local .env if it exists (for app-specific overrides)
  dotenvConfig({ path: path.resolve(__dirname, ".env") });
} else {
  console.log("🏭 Using production database setup");
  // Load from the transactional-supabase-foobar service .env file
  dotenvConfig({
    path: path.resolve(
      __dirname,
      "../transactional-supabase-foobar/database/prod/.env"
    ),
  });
  // Also load local .env if it exists (for app-specific overrides)
  dotenvConfig({ path: path.resolve(__dirname, ".env") });
}

// Database connection configuration
let connectionString: string;

if (isSupabaseCLI || process.env.NODE_ENV === "development") {
  // Supabase CLI default connection for migrations
  connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
} else if (isGitHubActions || (isProduction && process.env.DATABASE_URL)) {
  // GitHub Actions or production with DATABASE_URL provided
  connectionString = process.env.DATABASE_URL!;
} else {
  // Self-hosted production setup with Supavisor session mode for migrations
  const password =
    process.env.POSTGRES_PASSWORD ||
    "your-super-secret-and-long-postgres-password";
  const tenantId = process.env.POOLER_TENANT_ID || "dev";
  connectionString = `postgresql://postgres.${tenantId}:${password}@localhost:5432/postgres`;
}

export default {
  schema: "./src/database/schema.ts",
  out: "./database/supabase/migrations", // Output to Supabase migrations directory
  driver: "pg",
  dbCredentials: {
    connectionString,
  },
} satisfies Config;
