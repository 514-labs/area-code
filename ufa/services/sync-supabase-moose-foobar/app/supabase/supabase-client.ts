import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config as dotenvConfig } from "dotenv";
import path from "path";

interface SyncConfig {
  supabaseUrl: string;
  supabaseKey: string;
  dbSchema: string;
}

export function isCliMode(): boolean {
  return (
    process.env.SUPABASE_CLI === "true" ||
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV !== "production"
  );
}

// Load environment variables based on setup
function loadEnvironmentVariables(): void {
  const isSupabaseCLI = isCliMode();

  if (isSupabaseCLI) {
    console.log("🚀 Using Supabase CLI for development");
    // Load development defaults first
    dotenvConfig({ path: path.resolve(process.cwd(), ".env.development") });
    // Then override with local .env if it exists
    dotenvConfig({ path: path.resolve(process.cwd(), ".env") });
  } else {
    console.log("prod setup not implemented yet");
    //console.log("🏭 Using production database setup");
    // Load from the transactional-supabase-foobar service .env file
    // dotenvConfig({
    //   path: path.resolve(process.cwd(), "../transactional-supabase-foobar/database/prod/.env"),
    // });
    // Also load local .env if it exists (for app-specific overrides)
    //dotenvConfig({ path: path.resolve(process.cwd(), ".env") });
  }
}

// Get Supabase configuration
export function getSupabaseConfig(): SyncConfig {
  // Load environment variables first
  loadEnvironmentVariables();

  const isSupabaseCLI = isCliMode();
  let config: SyncConfig;

  if (isSupabaseCLI) {
    // CLI mode: use values from .env.development (with .env overrides)
    config = {
      supabaseUrl: process.env.SUPABASE_PUBLIC_URL!,
      supabaseKey: process.env.SERVICE_ROLE_KEY!,
      dbSchema: process.env.DB_SCHEMA!,
    };
    console.log("🔗 Auto-configured for Supabase CLI");
    console.log(`   URL: ${config.supabaseUrl}`);
    console.log(`   Schema: ${config.dbSchema}`);

    // Validate development configuration
    if (!config.supabaseKey) {
      throw new Error(
        "SERVICE_ROLE_KEY is missing. Ensure .env.development file exists and contains the proper Supabase CLI keys."
      );
    }
  } else {
    // Production mode: use environment variables
    config = {
      supabaseUrl: process.env.SUPABASE_PUBLIC_URL || "http://localhost:8000",
      supabaseKey: process.env.SERVICE_ROLE_KEY || process.env.ANON_KEY || "",
      dbSchema: process.env.DB_SCHEMA || "public",
    };
    console.log("🏭 Using production configuration");
    console.log(`   URL: ${config.supabaseUrl}`);
    console.log(`   Schema: ${config.dbSchema}`);

    // Validate production configuration
    if (!config.supabaseKey) {
      throw new Error(
        "ANON_KEY or SERVICE_ROLE_KEY is required for production mode"
      );
    }
  }

  return config;
}

// Create and return a Supabase client
export function createSupabaseClient(): {
  client: SupabaseClient;
  config: SyncConfig;
} {
  const config = getSupabaseConfig();

  // Create Supabase client
  const client = createClient(config.supabaseUrl, config.supabaseKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  console.log(
    `✅ Supabase client configured (${isCliMode() ? "CLI" : "Production"} mode)`
  );

  return { client, config };
}
