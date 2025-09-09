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

export function getDbSchema(): string {
  return process.env.DB_SCHEMA || "public";
}
