import { DrizzleConfig, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { getConnectionString, getEnforceAuth } from "../env-vars";

function isTokenSafe(token: any): boolean {
  if (!token || typeof token !== "object") return false;
  if (token.sub && typeof token.sub !== "string") return false;
  if (token.role && typeof token.role !== "string") return false;
  const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT|JAVASCRIPT)\b/i;
  if (token.sub && sqlKeywords.test(token.sub)) return false;
  return true;
}

const adminBase = postgres(getConnectionString(), { prepare: false });
const rlsBase = postgres(getConnectionString(), { prepare: false });
const adminClient = drizzle({ client: adminBase } as DrizzleConfig);
const rlsClient = drizzle({ client: rlsBase } as DrizzleConfig);

export async function getAdminClient() {
  const runTransaction = ((transaction, config) => {
    return adminClient.transaction(transaction, config);
  }) as typeof adminClient.transaction;
  return { runTransaction };
}

export async function getRlsClient(accessToken?: string) {
  if (!getEnforceAuth()) return getAdminClient();
  const token = decode(accessToken || "");
  if (accessToken && !isTokenSafe(token)) throw new Error("Invalid JWT token format");

  const runTransaction = ((transaction, config) => {
    return rlsClient.transaction(async (tx) => {
      try {
        await tx.execute(sql`
          select set_config('request.jwt.claims', ${JSON.stringify(token)}, TRUE);
          select set_config('request.jwt.claim.sub', ${token.sub ?? ""}, TRUE);
        `);
        return await transaction(tx);
      } finally {
        await tx.execute(sql`
          select set_config('request.jwt.claims', NULL, TRUE);
          select set_config('request.jwt.claim.sub', NULL, TRUE);
        `);
      }
    }, config);
  }) as typeof rlsClient.transaction;

  return { runTransaction };
}

function decode(accessToken: string) {
  try {
    return jwtDecode<JwtPayload & { role: string }>(accessToken);
  } catch {
    return { role: "anon" } as JwtPayload & { role: string };
  }
}


