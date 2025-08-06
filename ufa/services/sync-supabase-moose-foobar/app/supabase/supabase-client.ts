import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config as dotenvConfig } from "dotenv";
import path from "path";
import {
  isProduction,
  isDevelopment,
  isSupabaseCli,
  getSupabasePublicUrl,
  getServiceRoleKey,
  getAnonKey,
  getDbSchema,
} from "../env-vars";

interface SyncConfig {
  supabaseUrl: string;
  supabaseKey: string;
  dbSchema: string;
}

export function isCliMode(): boolean {
  return isSupabaseCli() || isDevelopment() || !isProduction();
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
      supabaseUrl: getSupabasePublicUrl(),
      supabaseKey: getServiceRoleKey(),
      dbSchema: getDbSchema(),
    };
    console.log("🔗 Auto-configured for Supabase CLI");
    console.log(`   URL: ${config.supabaseUrl}`);
    console.log(`   Schema: ${config.dbSchema}`);
  } else {
    // Production mode: use environment variables
    try {
      const serviceRoleKey = getServiceRoleKey();
      config = {
        supabaseUrl: getSupabasePublicUrl(),
        supabaseKey: serviceRoleKey,
        dbSchema: getDbSchema(),
      };
    } catch (error) {
      // Fallback to anonymous key if service role key is missing
      const anonKey = getAnonKey();
      if (!anonKey) {
        throw new Error(
          "Either SERVICE_ROLE_KEY or ANON_KEY environment variable is required for production mode"
        );
      }
      config = {
        supabaseUrl: getSupabasePublicUrl(),
        supabaseKey: anonKey,
        dbSchema: getDbSchema(),
      };
    }

    console.log("🏭 Using production configuration");
    console.log(`   URL: ${config.supabaseUrl}`);
    console.log(`   Schema: ${config.dbSchema}`);
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
