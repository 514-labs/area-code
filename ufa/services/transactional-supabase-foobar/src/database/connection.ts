import { DrizzleConfig, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { JwtPayload, jwtDecode } from "jwt-decode";
import postgres from "postgres";
import { getSupabaseConnectionString, getEnforceAuth } from "../env-vars.js";
import * as schema from "./schema.js";

function getIsTokenValid(token: any): boolean {
  if (!token || typeof token !== "object") {
    return false;
  }

  if (token.sub && typeof token.sub !== "string") {
    return false;
  }

  if (token.role && typeof token.role !== "string") {
    return false;
  }

  // Check for SQL metacharacters and injection patterns
  const sqlKeywords =
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT|JAVASCRIPT)\b/i;

  if (sqlKeywords.test(token.sub)) {
    return false;
  }

  return true;
}

const config = {
  casing: "snake_case",
  schema,
} satisfies DrizzleConfig<typeof schema>;

const adminClient = drizzle({
  client: postgres(getSupabaseConnectionString(), { prepare: false }),
  ...config,
});

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

  if (accessToken && !getIsTokenValid(token)) {
    throw new Error("Invalid JWT token format");
  }

  const role = accessToken ? token.role : "anon";

  const runTransaction = ((transaction, config) => {
    return rlsClient.transaction(async (tx) => {
      try {
        await tx.execute(sql`SET LOCAL ROLE ${sql.raw(role)}`);
        // Set up Supabase auth context
        await tx.execute(sql`
          select set_config('request.jwt.claims', '${sql.raw(
            JSON.stringify(token)
          )}', TRUE);
          select set_config('request.jwt.claim.sub', '${sql.raw(
            token.sub ?? ""
          )}', TRUE);
        `);

        return await transaction(tx);
      } finally {
        // Clean up
        await tx.execute(sql`
          select set_config('request.jwt.claims', NULL, TRUE);
          select set_config('request.jwt.claim.sub', NULL, TRUE);
        `);

        await tx.execute(sql`SET LOCAL ROLE postgres`);
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
