import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import dotenv from "dotenv";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the prod directory
dotenv.config({ path: resolve(__dirname, "../prod/.env") });

// Configuration
const config = {
  dbHost: process.env.POSTGRES_HOST || "127.0.0.1",
  dbPort: process.env.POSTGRES_PORT || "54322", // Updated to Supabase CLI port
  dbName: process.env.POSTGRES_DB || "postgres",
  dbUser: "postgres",
  dbPassword: process.env.POSTGRES_PASSWORD || "postgres",
  dockerContainer: "supabase_db_transactional-supabase-foobar", // Actual running container name
};

async function teardownReplication() {
  console.log("🛑 Tearing down realtime replication for all tables...");
  console.log("=".repeat(60));

  try {
    console.log(
      "🔗 Database:",
      `${config.dbHost}:${config.dbPort}/${config.dbName}`
    );
    console.log("🐳 Container:", config.dockerContainer);

    // Check if Docker container is running
    try {
      const containerStatus = execSync(
        `docker ps --filter name=${config.dockerContainer} --format "{{.Status}}"`,
        { encoding: "utf8" }
      ).trim();

      if (!containerStatus) {
        console.error(
          "❌ Docker container not found or not running:",
          config.dockerContainer
        );
        console.log("💡 Make sure Supabase is running with: pnpm dev:start");
        process.exit(1);
      }

      console.log("✅ Docker container is running:", containerStatus);
    } catch (error) {
      console.error(
        "❌ Failed to check Docker container status:",
        error.message
      );
      process.exit(1);
    }

    // SQL commands to disable replication
    const teardownSQL = `
-- Disable Row Level Security on tables
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_record.table_name);
            RAISE NOTICE 'Disabled RLS for table: %', table_record.table_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to disable RLS for table %: %', table_record.table_name, SQLERRM;
        END;
    END LOOP;
END$$;

-- Drop existing policies (optional cleanup)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                         policy_record.policyname, 
                         policy_record.schemaname, 
                         policy_record.tablename);
            RAISE NOTICE 'Dropped policy: % on %.%', 
                       policy_record.policyname, 
                       policy_record.schemaname, 
                       policy_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to drop policy %: %', policy_record.policyname, SQLERRM;
        END;
    END LOOP;
END$$;

SELECT 'Realtime replication teardown completed' as status;
`;

    // Execute SQL via docker exec
    const dockerCommand = `docker exec -i ${config.dockerContainer} psql -U ${config.dbUser} -d ${config.dbName}`;

    console.log("🔧 Executing teardown SQL commands...");

    try {
      const result = execSync(dockerCommand, {
        input: teardownSQL,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      console.log("📊 SQL Output:");
      console.log(result);
      console.log("✅ Realtime replication teardown completed successfully!");
    } catch (error) {
      console.error("❌ Failed to execute SQL commands:", error.message);
      if (error.stdout) {
        console.log("📊 SQL Output:", error.stdout);
      }
      if (error.stderr) {
        console.error("📊 SQL Errors:", error.stderr);
      }
      throw error;
    }
  } catch (error) {
    console.error("❌ Teardown failed:", error.message);
    process.exit(1);
  }
}

async function checkReplicationStatus() {
  console.log("🔍 Checking realtime replication status...");

  try {
    const statusSQL = `
SELECT 
    table_name,
    row_security as rls_enabled
FROM information_schema.tables t
LEFT JOIN pg_class c ON c.relname = t.table_name
WHERE t.table_schema = 'public' 
AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
`;

    const dockerCommand = `docker exec -i ${config.dockerContainer} psql -U ${config.dbUser} -d ${config.dbName}`;

    const result = execSync(dockerCommand, {
      input: statusSQL,
      encoding: "utf8",
    });

    console.log("📊 Current Status:");
    console.log(result);
  } catch (error) {
    console.error("❌ Failed to check status:", error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--status") || args.includes("-s")) {
    await checkReplicationStatus();
  } else if (args.includes("--help") || args.includes("-h")) {
    console.log(`
🛑 Realtime Replication Teardown Tool

Usage:
  npm run replication:stop          Disable replication for all tables
  npm run replication:stop --status Check current replication status
  npm run replication:stop --help   Show this help

This tool:
- Disables Row Level Security (RLS) on all tables
- Removes existing policies
- Breaks realtime connections

Requirements:
- Docker container '${config.dockerContainer}' must be running
- Environment variables must be configured

To re-enable replication, use:
  npm run setup:replication
`);
  } else {
    await teardownReplication();
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled rejection:", reason);
  process.exit(1);
});

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
