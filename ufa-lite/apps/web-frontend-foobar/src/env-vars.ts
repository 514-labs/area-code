export function getTransactionApiBase() {
  const value = import.meta.env.VITE_TRANSACTIONAL_API_BASE;

  if (!value) {
    throw new Error("Missing env var: VITE_TRANSACTIONAL_API_BASE");
  }

  return value;
}

export function getAnalyticalConsumptionApiBase() {
  const value = import.meta.env.VITE_ANALYTICAL_CONSUMPTION_API_BASE;

  if (!value) {
    throw new Error("Missing env var: VITE_ANALYTICAL_CONSUMPTION_API_BASE");
  }

  return value;
}

// Retrieval API base is omitted in ufa-lite

export function getSupabaseUrl() {
  const value = import.meta.env.VITE_SUPABASE_URL;
  if (!value) throw new Error("Missing env var: VITE_SUPABASE_URL");
  return value;
}

export function getSupabaseAnonKey() {
  const value = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!value) throw new Error("Missing env var: VITE_SUPABASE_ANON_KEY");
  return value;
}
