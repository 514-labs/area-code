import { config as dotenvConfig } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({ path: path.resolve(__dirname, "../.env") });
dotenvConfig({
  path: path.resolve(__dirname, "../.env.development"),
  override: true,
});
dotenvConfig({
  path: path.resolve(__dirname, "../.env.local"),
  override: true,
});

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
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
