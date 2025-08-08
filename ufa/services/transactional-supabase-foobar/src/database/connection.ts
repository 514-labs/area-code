import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

function initConnection() {
  if (_db && _pool) return { db: _db, pool: _pool };

  if (!process.env.SUPABASE_CONNECTION_STRING) {
    throw new Error("SUPABASE_CONNECTION_STRING is not set");
  }

  const connectionString: string = process.env.SUPABASE_CONNECTION_STRING;

  _pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  _db = drizzle(_pool, { schema });
  return { db: _db, pool: _pool };
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const { db } = initConnection();
    return db[prop as keyof typeof db];
  },
});

export const pool = new Proxy({} as Pool, {
  get(target, prop) {
    const { pool } = initConnection();
    return pool[prop as keyof typeof pool];
  },
});
