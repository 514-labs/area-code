import { DrizzleConfig, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { JwtPayload, jwtDecode } from "jwt-decode";
import postgres from "postgres";
import { AsyncLocalStorage } from "async_hooks";
import { getSupabaseConnectionString, getEnforceAuth } from "../env-vars.js";
import * as schema from "./schema.js";

// AsyncLocalStorage to track access token per request
const accessTokenStorage = new AsyncLocalStorage<string | undefined>();

const config = {
  casing: "snake_case",
  schema,
} satisfies DrizzleConfig<typeof schema>;

// Admin client bypasses RLS using service role key
const adminClient = drizzle({
  client: postgres(getSupabaseConnectionString(), {
    prepare: false,
    connection: {
      application_name: "service_role_admin",
    },
  }),
  ...config,
});

// RLS protected client
const rlsClient = drizzle({
  client: postgres(getSupabaseConnectionString(), { prepare: false }),
  ...config,
});

export function getDrizzleSupabaseAdminClient() {
  const runTransaction = ((transaction, config) => {
    return adminClient.transaction(async (tx) => {
      try {
        // Set service_role context to bypass RLS
        await tx.execute(sql`set local role service_role;`);
        return await transaction(tx);
      } finally {
        // Reset role
        await tx.execute(sql`reset role;`);
      }
    }, config);
  }) as typeof adminClient.transaction;

  return {
    runTransaction,
    // Expose all drizzle methods directly
    select: adminClient.select.bind(adminClient),
    insert: adminClient.insert.bind(adminClient),
    update: adminClient.update.bind(adminClient),
    delete: adminClient.delete.bind(adminClient),
    transaction: adminClient.transaction.bind(adminClient),
    execute: adminClient.execute.bind(adminClient),
  };
}

export function getDrizzleSupabaseClient() {
  const setAuthContext = async (accessToken?: string) => {
    const token = accessToken ? decode(accessToken) : null;

    if (token) {
      await rlsClient.execute(sql`
        select set_config('request.jwt.claims', '${sql.raw(JSON.stringify(token))}', TRUE);
        select set_config('request.jwt.claim.sub', '${sql.raw(token.sub ?? "")}', TRUE);
        set local role ${sql.raw(token.role ?? "anon")};
      `);
    } else {
      await rlsClient.execute(sql`
        select set_config('request.jwt.claims', NULL, TRUE);
        select set_config('request.jwt.claim.sub', NULL, TRUE);
        set local role anon;
      `);
    }
  };

  return {
    select: (accessToken?: string) => {
      return async (...args: Parameters<typeof rlsClient.select>) => {
        await setAuthContext(accessToken);
        return rlsClient.select(...args);
      };
    },

    insert: (accessToken?: string) => {
      return async (...args: Parameters<typeof rlsClient.insert>) => {
        await setAuthContext(accessToken);
        return rlsClient.insert(...args);
      };
    },

    update: (accessToken?: string) => {
      return async (...args: Parameters<typeof rlsClient.update>) => {
        await setAuthContext(accessToken);
        return rlsClient.update(...args);
      };
    },

    delete: (accessToken?: string) => {
      return async (...args: Parameters<typeof rlsClient.delete>) => {
        await setAuthContext(accessToken);
        return rlsClient.delete(...args);
      };
    },

    transaction: (accessToken?: string) => {
      return (callback: any, config?: any) => {
        return rlsClient.transaction(async (tx) => {
          await setAuthContext(accessToken);
          return await callback(tx);
        }, config);
      };
    },
  };
}

function decode(accessToken: string) {
  try {
    return jwtDecode<JwtPayload & { role: string }>(accessToken);
  } catch {
    return { role: "anon" } as JwtPayload & { role: string };
  }
}

export function getDb(accessToken?: string) {
  const enforceAuth = getEnforceAuth();

  if (!enforceAuth) {
    return getDrizzleSupabaseAdminClient();
  }

  const rlsClient = getDrizzleSupabaseClient();

  return {
    select: rlsClient.select(accessToken),
    insert: rlsClient.insert(accessToken),
    update: rlsClient.update(accessToken),
    delete: rlsClient.delete(accessToken),
    runTransaction: rlsClient.transaction(accessToken),
    transaction: rlsClient.transaction(accessToken),
    execute: async (...args: Parameters<typeof adminClient.execute>) => {
      const token = accessToken ? decode(accessToken) : null;
      if (token) {
        await adminClient.execute(sql`
          select set_config('request.jwt.claims', '${sql.raw(JSON.stringify(token))}', TRUE);
          select set_config('request.jwt.claim.sub', '${sql.raw(token.sub ?? "")}', TRUE);
          set local role ${sql.raw(token.role ?? "anon")};
        `);
      } else {
        await adminClient.execute(sql`
          select set_config('request.jwt.claims', NULL, TRUE);
          select set_config('request.jwt.claim.sub', NULL, TRUE);
          set local role anon;
        `);
      }
      return adminClient.execute(...args);
    },
  };
}
