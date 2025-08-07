export function getAnalyticsBaseUrl(): string {
  const url = process.env.ANALYTICS_BASE_URL;
  if (!url) {
    throw new Error(
      "ANALYTICS_BASE_URL environment variable is required but not set. " +
        "Please check your .env.development file or set it in production."
    );
  }
  return url;
}

export function getRetrievalBaseUrl(): string {
  const url = process.env.RETRIEVAL_BASE_URL;
  if (!url) {
    throw new Error(
      "RETRIEVAL_BASE_URL environment variable is required but not set. " +
        "Please check your .env.development file or set it in production."
    );
  }
  return url;
}

export function getNodeEnv(): string {
  return process.env.NODE_ENV || "development";
}

export function isProduction(): boolean {
  return getNodeEnv() === "production";
}

export function isDevelopment(): boolean {
  return getNodeEnv() === "development";
}

export function getSupabaseConnectionString(): string {
  const connectionString = process.env.SUPABASE_CONNECTION_STRING;
  if (isProduction() && !connectionString) {
    throw new Error(
      "SUPABASE_CONNECTION_STRING environment variable is required in production. " +
        "Format: postgresql://postgres:[password]@[host]:[port]/postgres"
    );
  }
  return connectionString || "";
}

export function getSupabasePublicUrl(): string {
  const url = process.env.SUPABASE_PUBLIC_URL;
  if (!url) {
    throw new Error(
      "SUPABASE_PUBLIC_URL environment variable is required but not set. " +
        "Please check your .env.development file or set it in production."
    );
  }
  return url;
}

export function getServiceRoleKey(): string {
  const key = process.env.SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SERVICE_ROLE_KEY environment variable is required but not set. " +
        "Please check your .env.development file or set it in production."
    );
  }
  return key;
}

export function getAnonKey(): string {
  return process.env.ANON_KEY || "";
}

export function getDbSchema(): string {
  return process.env.DB_SCHEMA || "public";
}

export function getPostgresHost(): string {
  const host = process.env.POSTGRES_HOST;
  if (!host) {
    throw new Error(
      "POSTGRES_HOST environment variable is required but not set. " +
        "Please check your .env.development file or set it in production."
    );
  }
  return host;
}

export function getPostgresPort(): number {
  const port = process.env.POSTGRES_PORT;
  if (!port) {
    throw new Error(
      "POSTGRES_PORT environment variable is required but not set. " +
        "Please check your .env.development file or set it in production."
    );
  }
  return parseInt(port, 10);
}

export function getPostgresDatabase(): string {
  const database = process.env.POSTGRES_DATABASE;
  if (!database) {
    throw new Error(
      "POSTGRES_DATABASE environment variable is required but not set. " +
        "Please check your .env.development file or set it in production."
    );
  }
  return database;
}

export function getPostgresUser(): string {
  const user = process.env.POSTGRES_USER;
  if (!user) {
    throw new Error(
      "POSTGRES_USER environment variable is required but not set. " +
        "Please check your .env.development file or set it in production."
    );
  }
  return user;
}

export function getPostgresPassword(): string {
  const password = process.env.POSTGRES_PASSWORD;
  if (!password) {
    throw new Error(
      "POSTGRES_PASSWORD environment variable is required but not set. " +
        "Please check your .env.development file or set it in production."
    );
  }
  return password;
}

export function getPostgresSslEnabled(): boolean {
  const ssl = process.env.POSTGRES_SSL_ENABLED;
  return ssl === "true" || ssl === "1";
}
