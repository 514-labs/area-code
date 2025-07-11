export function getTransactionApiBase() {
  const value = import.meta.env.VITE_TRANSACTIONAL_API_BASE;

  if (!value) {
    throw new Error("Missing env var: VITE_TRANSACTIONAL_API_BASE");
  }

  return value;
}
