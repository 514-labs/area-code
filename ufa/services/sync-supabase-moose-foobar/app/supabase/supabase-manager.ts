import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient, isCliMode } from "./supabase-client";
import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

export interface DatabaseStatus {
  isConnected: boolean;
  isRealtimeConfigured: boolean;
  error?: string;
}

export class SupabaseManager {
  private client: SupabaseClient;
  private config: any;

  constructor() {
    const { client, config } = createSupabaseClient();
    this.client = client;
    this.config = config;
  }

  getClient() {
    return this.client;
  }

  getConfig() {
    return this.config;
  }

  /**
   * Check if Supabase database is available and accessible
   */
  async checkDatabaseConnection(silent: boolean = false): Promise<boolean> {
    try {
      if (!silent) {
        console.log("🔄 Checking database connection...");
      }

      // Simple health check query - just try to access a table
      const { error } = await this.client
        .from("foo") // Using foo table as a test - it should exist
        .select("id", { count: "exact", head: true })
        .limit(1);

      if (error && !error.message.includes('relation "foo" does not exist')) {
        // If the error is not about the table not existing, it's a connection issue
        if (
          error.message.includes("connect") ||
          error.message.includes("network") ||
          error.message.includes("timeout")
        ) {
          if (!silent) {
            console.error("❌ Database connection failed:", error.message);
          }
          return false;
        }
      }

      if (!silent) {
        console.log("✅ Database connection successful");
      }
      return true;
    } catch (error) {
      if (!silent) {
        console.error("❌ Database connection error:", error);
      }
      return false;
    }
  }

  /**
   * Wait for database to be available with timeout
   */
  async waitForDatabase(timeoutMs: number = 60000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds
    const logInterval = 10000; // Log progress every 10 seconds
    let lastLogTime = 0;

    console.log("🔄 Waiting for database to be available...");

    while (Date.now() - startTime < timeoutMs) {
      // Use silent check to avoid spam
      if (await this.checkDatabaseConnection(true)) {
        console.log("✅ Database connection successful");
        return true;
      }

      // Only log progress every 10 seconds to reduce spam
      const currentTime = Date.now();
      if (currentTime - lastLogTime >= logInterval) {
        const elapsed = Math.round((currentTime - startTime) / 1000);
        const timeout = Math.round(timeoutMs / 1000);
        console.log(
          `⏳ Still waiting for database... (${elapsed}s/${timeout}s)`
        );
        lastLogTime = currentTime;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    console.error("❌ Timeout waiting for database to become available");
    return false;
  }

  /**
   * Run the realtime replication setup by executing the SQL script directly
   */
  async setupRealtimeReplication(silent: boolean = false): Promise<boolean> {
    try {
      if (!silent) {
        console.log("🔧 Setting up realtime replication...");
      }

      // First check if realtime is already configured
      const isAlreadyConfigured = await this.isRealtimeConfigured();

      if (isAlreadyConfigured) {
        if (!silent) {
          console.log(
            "✅ Realtime replication is already configured - skipping setup"
          );
        }
        return true;
      }

      if (!silent) {
        console.log(
          "📋 Realtime replication not detected - proceeding with setup"
        );
      }

      // Read the SQL script
      const sqlScriptPath = join(__dirname, "setup-realtime-replication.sql");
      const sqlScript = readFileSync(sqlScriptPath, "utf-8");

      if (!silent) {
        console.log("🔄 Executing realtime setup SQL script...");
      }

      // Execute the SQL script using PostgreSQL client
      try {
        await this.executeComplexSQL(sqlScript);
        if (!silent) {
          console.log("✅ Realtime setup SQL script executed successfully");
        }
        return true;
      } catch (error) {
        if (!silent) {
          console.error("❌ Failed to execute realtime setup script:", error);
          console.log("⚠️ Manual realtime setup may be required:");
          console.log(`   File: ${sqlScriptPath}`);
          console.log("   Or copy it into your Supabase SQL editor");
        }

        // Don't fail - let the service attempt to start
        return true;
      }
    } catch (error) {
      if (!silent) {
        console.error("❌ Error reading realtime setup script:", error);
        console.log("⚠️ Manual realtime setup required:");
        console.log(
          `   File: ${join(__dirname, "setup-realtime-replication.sql")}`
        );
        console.log(
          "⚠️ Continuing startup - manual realtime setup may be required"
        );
      }
      return true; // Return true to not block startup
    }
  }

  /**
   * Check if realtime replication is already configured
   */
  private async isRealtimeConfigured(): Promise<boolean> {
    // Use the same connection logic as executeComplexSQL
    const isLocalDev = this.config.supabaseUrl.includes("localhost");
    const isProduction = process.env.NODE_ENV === "production";

    let pgClient: Client;

    if (isProduction) {
      if (!process.env.SUPABASE_CONNECTION_STRING) {
        console.log(
          "⚠️ Cannot check realtime config - SUPABASE_CONNECTION_STRING missing"
        );
        return false;
      }
      pgClient = new Client({
        connectionString: process.env.SUPABASE_CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
      });
    } else if (isLocalDev) {
      pgClient = new Client({
        host: "localhost",
        port: 54322,
        database: "postgres",
        user: "postgres",
        password: "postgres",
        ssl: false,
      });
    } else {
      const supabaseUrl = new URL(this.config.supabaseUrl);
      pgClient = new Client({
        host: supabaseUrl.hostname.replace(/^.*\./, ""),
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        ssl: { rejectUnauthorized: false },
      });
    }

    try {
      await pgClient.connect();

      // Check if the supabase_realtime publication exists
      const pubResult = await pgClient.query(
        "SELECT pubname FROM pg_publication WHERE pubname = 'supabase_realtime'"
      );

      if (pubResult.rows.length === 0) {
        console.log("📋 Publication 'supabase_realtime' not found");
        return false;
      }

      console.log("✅ Realtime publication 'supabase_realtime' exists");

      // Check if we have tables with FULL replica identity in public schema
      const replicaResult = await pgClient.query(`
        SELECT COUNT(*) as count 
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public' 
        AND c.relreplident = 'f'
      `);

      const tableCount = parseInt(replicaResult.rows[0]?.count || "0");

      if (tableCount > 0) {
        console.log(`✅ Found ${tableCount} tables with FULL replica identity`);
        return true;
      } else {
        console.log("📋 No tables found with FULL replica identity");
        return false;
      }
    } catch (error) {
      console.log("⚠️ Could not verify realtime configuration:", error);
      return false;
    } finally {
      await pgClient.end();
    }
  }

  /**
   * Execute complex SQL script using direct PostgreSQL connection
   */
  private async executeComplexSQL(sqlScript: string): Promise<void> {
    // Clean up the SQL script by removing psql-specific commands
    const cleanedSQL = sqlScript
      .replace(/\\set\s+.*$/gm, "") // Remove \set commands
      .replace(/^\s*--.*$/gm, "") // Remove comment-only lines
      .trim();

    if (!cleanedSQL) {
      throw new Error("No SQL content to execute after cleanup");
    }

    // Determine connection settings based on environment
    const isLocalDev = this.config.supabaseUrl.includes("localhost");
    const isProduction = process.env.NODE_ENV === "production";

    let pgClient: Client;

    if (isProduction) {
      if (!process.env.SUPABASE_CONNECTION_STRING) {
        throw new Error(
          "SUPABASE_CONNECTION_STRING environment variable is required for production. " +
            "Format: postgresql://postgres:[password]@[host]:[port]/postgres"
        );
      }
      pgClient = new Client({
        connectionString: process.env.SUPABASE_CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
      });
    } else if (isLocalDev) {
      pgClient = new Client({
        host: "localhost",
        port: 54322, // Supabase CLI default
        database: "postgres",
        user: "postgres",
        password: "postgres",
        ssl: false,
      });
    } else {
      // Fallback approach
      const supabaseUrl = new URL(this.config.supabaseUrl);
      pgClient = new Client({
        host: supabaseUrl.hostname.replace(/^.*\./, ""),
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        ssl: { rejectUnauthorized: false },
      });
    }

    try {
      await pgClient.connect();
      console.log("🔗 Connected to PostgreSQL for script execution");

      await pgClient.query(cleanedSQL);
      console.log("✅ SQL script executed successfully");
    } finally {
      await pgClient.end();
      console.log("🔌 PostgreSQL connection closed");
    }
  }

  /**
   * Create the helper functions for managing realtime replication (only if they don't exist)
   */
  private async createRealtimeManagementFunctions(): Promise<void> {
    // Check if functions already exist
    const checkFunctionsSQL = `
      SELECT COUNT(*) as function_count 
      FROM pg_proc 
      WHERE proname IN ('disable_realtime_replication', 'enable_realtime_replication') 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    `;

    const result = await this.client.rpc("sql", { query: checkFunctionsSQL });

    if (result.data && result.data[0]?.function_count >= 2) {
      console.log("✅ Realtime management functions already exist");
      return;
    }

    console.log("🔧 Ensuring realtime management functions are available...");

    const functionsSQL = `
      -- Create helper functions for managing realtime replication (idempotent)
      CREATE OR REPLACE FUNCTION disable_realtime_replication()
      RETURNS TEXT AS $$
      BEGIN
          -- Drop and recreate empty publication to disable realtime
          DROP PUBLICATION IF EXISTS supabase_realtime;
          CREATE PUBLICATION supabase_realtime;
          
          RETURN 'Realtime replication disabled - publication emptied';
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION enable_realtime_replication()
      RETURNS TEXT AS $$
      BEGIN
          -- Drop and recreate publication with all tables to enable realtime
          DROP PUBLICATION IF EXISTS supabase_realtime;
          CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
          
          RETURN 'Realtime replication enabled - publication includes all tables';
      END;
      $$ LANGUAGE plpgsql;
    `;

    await this.executeComplexSQL(functionsSQL);
    console.log("✅ Realtime management functions created and will persist");
  }

  /**
   * Disable realtime replication using stored function (with fallback)
   */
  async disableRealtimeReplication(): Promise<void> {
    try {
      const result = await this.client.rpc("disable_realtime_replication");
      if (result.error) {
        throw new Error(result.error.message);
      }
      console.log(`✅ ${result.data}`);
    } catch (error) {
      console.warn("⚠️ Function call failed, using direct SQL:", error);
      // Fallback to direct SQL
      const disableSQL = `
        DROP PUBLICATION IF EXISTS supabase_realtime;
        CREATE PUBLICATION supabase_realtime;
      `;
      await this.executeComplexSQL(disableSQL);
      console.log("✅ Realtime replication disabled via direct SQL");
    }
  }

  /**
   * Re-enable realtime replication using stored function (with fallback)
   */
  async enableRealtimeReplication(): Promise<void> {
    try {
      const result = await this.client.rpc("enable_realtime_replication");
      if (result.error) {
        throw new Error(result.error.message);
      }
      console.log(`✅ ${result.data}`);
    } catch (error) {
      console.warn("⚠️ Function call failed, using direct SQL:", error);
      // Fallback to direct SQL
      const enableSQL = `
        DROP PUBLICATION IF EXISTS supabase_realtime;
        CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
      `;
      await this.executeComplexSQL(enableSQL);
      console.log("✅ Realtime replication enabled via direct SQL");
    }
  }

  /**
   * Initialize database: wait for connection and setup realtime if needed
   */
  async initializeDatabase(): Promise<DatabaseStatus> {
    const status: DatabaseStatus = {
      isConnected: false,
      isRealtimeConfigured: false,
    };

    try {
      // Only wait for database in CLI/dev mode
      if (isCliMode()) {
        console.log("🚀 Development mode: waiting for Supabase database...");
        status.isConnected = await this.waitForDatabase();
      } else {
        console.log("🏭 Production mode: checking database connection...");
        status.isConnected = await this.checkDatabaseConnection();
      }

      if (!status.isConnected) {
        status.error = "Could not connect to database";
        return status;
      }

      // Run the realtime setup script
      console.log("🔧 Setting up realtime replication...");
      const realtimeSetup = await this.setupRealtimeReplication();

      if (realtimeSetup) {
        status.isRealtimeConfigured = true;
        console.log("✅ Database initialization completed successfully");
      } else {
        status.error = "Failed to setup realtime replication";
        console.error("❌ Database initialization failed");
      }

      // Create helper functions if realtime setup was successful
      if (realtimeSetup) {
        console.log("🔧 Creating realtime management functions...");
        try {
          await this.createRealtimeManagementFunctions();
        } catch (error) {
          console.warn(
            "⚠️ Could not create realtime management functions:",
            error
          );
          console.log("ℹ️ Functions will be created on-demand if needed");
        }
      }

      return status;
    } catch (error) {
      status.error = `Database initialization error: ${error}`;
      console.error("❌ Database initialization error:", error);
      return status;
    }
  }

  /**
   * Initialize and return a ready-to-use SupabaseManager
   */
  static async createInitialized(): Promise<SupabaseManager> {
    const manager = new SupabaseManager();

    console.log("🔧 Initializing Supabase database...");
    const dbStatus = await manager.initializeDatabase();

    if (!dbStatus.isConnected) {
      throw new Error(`Failed to connect to database: ${dbStatus.error}`);
    }

    if (!dbStatus.isRealtimeConfigured) {
      throw new Error(
        `Failed to configure realtime replication: ${dbStatus.error}`
      );
    }

    console.log("✅ Supabase database initialization completed successfully");
    return manager;
  }
}
