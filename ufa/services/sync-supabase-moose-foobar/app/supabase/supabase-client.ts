import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicUrl,
  getServiceRoleKey,
  getDbSchema,
} from "../env-vars";

export type SupabaseConfig = {
  supabaseUrl: string;
  supabaseKey: string;
  dbSchema: string;
};

export function getSupabaseConfig(): SupabaseConfig {
  const config: SupabaseConfig = {
    supabaseUrl: getSupabasePublicUrl(),
    supabaseKey: getServiceRoleKey(),
    dbSchema: getDbSchema(),
  };

  return config;
}

export function createSupabaseClient(): {
  client: SupabaseClient;
  config: SupabaseConfig;
} {
  const config = getSupabaseConfig();

  const client = createClient(config.supabaseUrl, config.supabaseKey, {
    realtime: {
      params: {
        eventsPerSecond: 10000,
      },
    },
  });

  return { client, config };
}

export async function checkDatabaseConnection(
  supabaseClient: SupabaseClient
): Promise<boolean> {
  try {
    const { error } = await supabaseClient
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
        return false;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}
