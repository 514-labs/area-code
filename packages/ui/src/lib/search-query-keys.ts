/**
 * Query keys for React Query search functionality
 * Following TanStack Query v5 best practices for key structure
 */

import type { SearchParams } from "../types/search";

export const searchQueryKeys = {
  // Base key for all search-related queries
  all: ["search"] as const,

  // Search results queries
  searches: () => [...searchQueryKeys.all, "searches"] as const,
  search: (params: SearchParams) =>
    [...searchQueryKeys.searches(), params] as const,

  // Specific entity searches
  foos: (params: SearchParams) =>
    [...searchQueryKeys.searches(), "foos", params] as const,
  bars: (params: SearchParams) =>
    [...searchQueryKeys.searches(), "bars", params] as const,

  // Recent searches
  recent: () => [...searchQueryKeys.all, "recent"] as const,

  // Search suggestions/autocomplete
  suggestions: (query: string) =>
    [...searchQueryKeys.all, "suggestions", query] as const,
} as const;

/**
 * Helper to create stable query keys from search parameters
 * Removes undefined/null values and sorts keys for consistent caching
 */
export function createSearchKey(params: SearchParams) {
  // Filter out undefined/null values and create stable key
  const cleanParams = Object.entries(params)
    .filter(
      ([_, value]) => value !== undefined && value !== null && value !== ""
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  return searchQueryKeys.search(cleanParams as SearchParams);
}
