import { config as dotenvConfig } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({ path: path.resolve(__dirname, "../.env") });
if (process.env.NODE_ENV === "development") {
  dotenvConfig({
    path: path.resolve(__dirname, "../.env.development"),
    override: true,
  });
  dotenvConfig({
    path: path.resolve(__dirname, "../.env.local"),
    override: true,
  });
}

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

export function getNodeEnv(): string {
  return process.env.NODE_ENV || "development";
}

export function getSupabaseConnectionString(): string {
  return getEnvVar("SUPABASE_CONNECTION_STRING");
}

export function getEnforceAuth(): boolean {
  return getEnvVar("ENFORCE_AUTH") === "true";
}

export function getAnthropicApiKey(): string {
  return getEnvVar("ANTHROPIC_API_KEY");
}

export function getClickhouseDatabase(): string {
  return getEnvVar("CLICKHOUSE_DATABASE");
}

export function getClickhouseHost(): string {
  return getEnvVar("CLICKHOUSE_HOST");
}

export function getClickhousePassword(): string {
  return getEnvVar("CLICKHOUSE_PASSWORD");
}

export function getClickhousePort(): string {
  return getEnvVar("CLICKHOUSE_PORT");
}

export function getClickhouseUser(): string {
  return getEnvVar("CLICKHOUSE_USER");
}
