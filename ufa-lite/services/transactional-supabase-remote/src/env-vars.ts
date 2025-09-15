export function getConnectionString(): string {
  const value = process.env.TRANSACTIONAL_DB_CONNECTION_STRING;
  if (!value) throw new Error("TRANSACTIONAL_DB_CONNECTION_STRING is required");
  return value;
}

export function getEnforceAuth(): boolean {
  const raw = process.env.ENFORCE_AUTH;
  if (!raw) return true;
  return raw === "true";
}

export function getNodeEnv(): string {
  return process.env.NODE_ENV || "development";
}

