import type { SearchConfig } from "../types/search";

/**
 * Search configuration with safe defaults
 * Environment-specific URLs should be configured at the app level
 */
export function createSearchConfig(baseUrl?: string): SearchConfig {
  return {
    baseUrl: baseUrl || "http://localhost:8082",
    timeout: 5000,
    defaultPageSize: 8,
    debounceMs: 300,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  };
}

// Default configuration - apps can override this
export const searchConfig = createSearchConfig();

/**
 * Search-specific constants
 */
export const SEARCH_CONSTANTS = {
  MIN_QUERY_LENGTH: 1,
  MAX_QUERY_LENGTH: 500,
  MAX_RESULTS_PER_PAGE: 50,
  RECENT_SEARCHES_LIMIT: 5,
  RECENT_SEARCHES_STORAGE_KEY: "search-recent-queries",
} as const;
