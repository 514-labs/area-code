import type { SearchConfig } from "../types/search";
import { getRetrievalApiBase } from "@/env-vars";

/**
 * Search configuration using environment variables
 */
export const searchConfig: SearchConfig = {
  baseUrl: getRetrievalApiBase(),
  timeout: 5000,
  defaultPageSize: 8,
  debounceMs: 300,
  staleTime: 1000 * 60 * 5, // 5 minutes
  gcTime: 1000 * 60 * 10, // 10 minutes
};

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
