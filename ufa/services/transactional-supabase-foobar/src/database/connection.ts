import { DrizzleConfig, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { JwtPayload, jwtDecode } from "jwt-decode";
import postgres from "postgres";
import { getSupabaseConnectionString, getEnforceAuth } from "../env-vars.js";
import * as schema from "./schema.js";

const config = {
  casing: "snake_case",
  schema,
} satisfies DrizzleConfig<typeof schema>;

// Admin client bypasses RLS
const adminClient = drizzle({
  client: postgres(getSupabaseConnectionString(), { prepare: false }),
  ...config,
});

// RLS protected client
const rlsClient = drizzle({
  client: postgres(getSupabaseConnectionString(), { prepare: false }),
  ...config,
});

export async function getDrizzleSupabaseAdminClient() {
  const runTransaction = ((transaction, config) => {
    return adminClient.transaction(transaction, config);
  }) as typeof adminClient.transaction;

  return {
    runTransaction,
  };
}

export async function getDrizzleSupabaseClient(accessToken?: string) {
  if (!getEnforceAuth()) {
    return getDrizzleSupabaseAdminClient();
  }

  const token = decode(accessToken || "");

  const runTransaction = ((transaction, config) => {
    return rlsClient.transaction(async (tx) => {
      try {
        // Set up Supabase auth context
        await tx.execute(sql`
          select set_config('request.jwt.claims', '${sql.raw(
            JSON.stringify(token)
          )}', TRUE);
          select set_config('request.jwt.claim.sub', '${sql.raw(
            token.sub ?? ""
          )}', TRUE);
          set local role ${sql.raw(token.role ?? "anon")};
        `);

        return await transaction(tx);
      } finally {
        // Clean up
        await tx.execute(sql`
          select set_config('request.jwt.claims', NULL, TRUE);
          select set_config('request.jwt.claim.sub', NULL, TRUE);
          reset role;
        `);
      }
    }, config);
  }) as typeof rlsClient.transaction;

  return {
    runTransaction,
  };
}

function decode(accessToken: string) {
  try {
    return jwtDecode<JwtPayload & { role: string }>(accessToken);
  } catch {
    return { role: "anon" } as JwtPayload & { role: string };
  }
}
