import { readFileSync } from "fs";
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
  dockerContainer: "supabase_db_transactional-database", // Updated to Supabase CLI container name
};

async function setupReplication() {
  console.log("🚀 Setting up automated realtime replication for all tables...");
  console.log("=".repeat(60));

  try {
    // Path to the SQL setup script
    const sqlScriptPath = resolve(__dirname, "setup-realtime-replication.sql");

    console.log("📄 SQL Script:", sqlScriptPath);
    console.log(
      "🔗 Database:",
      `${config.dbHost}:${config.dbPort}/${config.dbName}`
    );
    console.log("🐳 Container:", config.dockerContainer);

    // Check if the SQL file exists
    try {
      readFileSync(sqlScriptPath);
      console.log("✅ SQL script file found");
    } catch {
      console.error("❌ SQL script file not found:", sqlScriptPath);
      process.exit(1);
    }

    // Check if Docker container is running
    try {
      const containerStatus = execSync(
        `docker ps --filter "name=${config.dockerContainer}" --format "{{.Status}}"`,
        { encoding: "utf8" }
      ).trim();

      if (!containerStatus) {
        console.error(
          "❌ Database container is not running. Please start it with: pnpm dev:start"
        );
        process.exit(1);
      }

      console.log("✅ Database container is running:", containerStatus);
    } catch (error) {
      console.error(
        "❌ Error checking container status:",
        (error as Error).message
      );
      process.exit(1);
    }

    console.log("\n🔄 Executing replication setup script...");
    console.log("-".repeat(60));

    // Execute the SQL script
    const command = `docker exec -i ${config.dockerContainer} psql -U ${config.dbUser} -d ${config.dbName} < "${sqlScriptPath}"`;

    try {
      const output = execSync(command, {
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large output
      });

      console.log(output);
    } catch (error) {
      console.error("❌ Error executing SQL script:");
      console.error(
        (error as { stdout?: string }).stdout || (error as Error).message
      );
      process.exit(1);
    }

    console.log("-".repeat(60));
    console.log("✅ Replication setup completed successfully!");

    // Verify the setup by checking publication
    console.log("\n🔍 Verifying setup...");
    try {
      const verifyCommand = `docker exec -i ${config.dockerContainer} psql -U ${config.dbUser} -d ${config.dbName} -c "SELECT COUNT(*) as table_count FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public';"`;
      const verifyOutput = execSync(verifyCommand, { encoding: "utf8" });

      const match = verifyOutput.match(/(\d+)/);
      const tableCount = match ? parseInt(match[1]) : 0;

      if (tableCount > 0) {
        console.log(
          `✅ ${tableCount} tables configured for realtime replication`
        );
      } else {
        console.log(
          "⚠️  No tables found in publication - this might be normal if no tables exist"
        );
      }
    } catch {
      console.log(
        "⚠️  Could not verify setup, but script execution was successful"
      );
    }

    console.log("\n🎯 Next Steps:");
    console.log("1. Run the realtime test: pnpm test:realtime:postgres");
    console.log("2. Start your API server: pnpm dev");
    console.log("3. Make changes to your tables to see realtime events");
  } catch (error) {
    console.error("❌ Setup failed:", (error as Error).message);
    process.exit(1);
  }
}

// Function to check current replication status
async function checkReplicationStatus() {
  console.log("🔍 Checking current replication status...");
  console.log("=".repeat(50));

  try {
    const commands = [
      {
        name: "Tables in public schema",
        query:
          "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;",
      },
      {
        name: "RLS Status",
        query:
          "SELECT schemaname, tablename, CASE WHEN rowsecurity THEN 'Enabled' ELSE 'Disabled' END as rls_status FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;",
      },
      {
        name: "Publication Tables",
        query:
          "SELECT pubname, schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' ORDER BY tablename;",
      },
      {
        name: "Policy Count",
        query:
          "SELECT schemaname, tablename, COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public' GROUP BY schemaname, tablename ORDER BY tablename;",
      },
    ];

    for (const cmd of commands) {
      console.log(`\n📊 ${cmd.name}:`);
      try {
        const output = execSync(
          `docker exec -i ${config.dockerContainer} psql -U ${config.dbUser} -d ${config.dbName} -c "${cmd.query}"`,
          { encoding: "utf8" }
        );
        console.log(output);
      } catch (error) {
        console.error(
          `❌ Error checking ${cmd.name}:`,
          (error as Error).message
        );
      }
    }
  } catch (error) {
    console.error("❌ Status check failed:", (error as Error).message);
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
🔧 Realtime Replication Setup Tool

Usage:
  npm run setup:replication          Setup replication for all tables
  npm run setup:replication --status Check current replication status
  npm run setup:replication --help   Show this help

This tool automatically:
- Enables Row Level Security (RLS) on all tables
- Sets replica identity to FULL
- Creates access policies for authenticated users
- Grants necessary permissions
- Creates updated_at triggers (if column exists)
- Configures publication for realtime

Requirements:
- Docker container '${config.dockerContainer}' must be running
- Environment variables must be configured
`);
  } else {
    await setupReplication();
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
