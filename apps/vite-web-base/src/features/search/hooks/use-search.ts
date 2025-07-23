import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { searchClient } from "../lib/search-client";
import { searchQueryKeys, createSearchKey } from "../lib/search-query-keys";
import { searchConfig, SEARCH_CONSTANTS } from "../lib/search-config";
import type { SearchParams, SearchResult } from "../types/search";

/**
 * Options for search hooks
 */
interface UseSearchOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Main search hook using React Query
 * Searches across all entities with debouncing and caching
 */
export function useSearch(
  searchParams: SearchParams,
  options: UseSearchOptions = {}
) {
  const {
    enabled = !!searchParams.q?.trim() &&
      searchParams.q.length >= SEARCH_CONSTANTS.MIN_QUERY_LENGTH,
    staleTime = searchConfig.staleTime,
    gcTime = searchConfig.gcTime,
  } = options;

  return useQuery({
    queryKey: createSearchKey(searchParams),
    queryFn: async (): Promise<SearchResult[]> => {
      const response = await searchClient.searchAll(searchParams);
      return searchClient.transformResults(response);
    },
    enabled,
    staleTime,
    gcTime,
    // Reduce network calls for search
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Keep previous data while fetching new results for smooth UX
    placeholderData: (previousData: SearchResult[] | undefined) => previousData,
    // Return empty array instead of undefined for easier handling
    select: (data: SearchResult[] | undefined) => data || [],
  });
}

/**
 * Hook for searching only Foo entities
 */
export function useSearchFoos(
  searchParams: SearchParams,
  options: UseSearchOptions = {}
) {
  const {
    enabled = !!searchParams.q?.trim() &&
      searchParams.q.length >= SEARCH_CONSTANTS.MIN_QUERY_LENGTH,
    staleTime = searchConfig.staleTime,
    gcTime = searchConfig.gcTime,
  } = options;

  return useQuery({
    queryKey: searchQueryKeys.foos(searchParams),
    queryFn: async () => {
      const response = await searchClient.searchFoos(searchParams);
      return searchClient.transformSingleTypeResults(response, "foo");
    },
    enabled,
    staleTime,
    gcTime,
    refetchOnWindowFocus: false,
    placeholderData: (previousData: SearchResult[] | undefined) => previousData,
    select: (data: SearchResult[] | undefined) => data || [],
  });
}

/**
 * Hook for searching only Bar entities
 */
export function useSearchBars(
  searchParams: SearchParams,
  options: UseSearchOptions = {}
) {
  const {
    enabled = !!searchParams.q?.trim() &&
      searchParams.q.length >= SEARCH_CONSTANTS.MIN_QUERY_LENGTH,
    staleTime = searchConfig.staleTime,
    gcTime = searchConfig.gcTime,
  } = options;

  return useQuery({
    queryKey: searchQueryKeys.bars(searchParams),
    queryFn: async () => {
      const response = await searchClient.searchBars(searchParams);
      return searchClient.transformSingleTypeResults(response, "bar");
    },
    enabled,
    staleTime,
    gcTime,
    refetchOnWindowFocus: false,
    placeholderData: (previousData: SearchResult[] | undefined) => previousData,
    select: (data: SearchResult[] | undefined) => data || [],
  });
}

/**
 * Debounced search hook that automatically debounces input
 */
export function useDebouncedSearch(
  query: string,
  additionalParams: Omit<SearchParams, "q"> = {},
  options: UseSearchOptions & { debounceMs?: number } = {}
) {
  const { debounceMs = searchConfig.debounceMs, ...searchOptions } = options;

  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Memoize search params to prevent unnecessary re-renders
  const searchParams = useMemo<SearchParams>(
    () => ({
      q: debouncedQuery,
      size: searchConfig.defaultPageSize,
      ...additionalParams,
    }),
    [debouncedQuery, additionalParams]
  );

  // Determine if the underlying search should be executed.
  // If the caller did not explicitly specify `enabled`, we defer execution
  // until the debounced value has been applied and meets the minimum length
  // criteria. This avoids an extra request with an empty string each time
  // the user types and eliminates the flashing behaviour in the results.

  const mergedOptions = {
    ...searchOptions,
    enabled:
      searchOptions.enabled !== undefined
        ? searchOptions.enabled
        : !!debouncedQuery.trim() &&
          debouncedQuery.length >= SEARCH_CONSTANTS.MIN_QUERY_LENGTH,
  } as UseSearchOptions;

  // Use the main search hook with debounced query
  const searchQuery = useSearch(searchParams, mergedOptions);

  return {
    ...searchQuery,
    query: debouncedQuery,
    isDebouncing: query !== debouncedQuery,
    originalQuery: query,
  };
}

/**
 * Hook for managing recent searches with localStorage persistence
 */
export function useRecentSearches() {
  const queryClient = useQueryClient();

  // Get recent searches from React Query cache or localStorage
  const { data: recentSearches = [] } = useQuery({
    queryKey: searchQueryKeys.recent(),
    queryFn: (): string[] => {
      if (typeof window === "undefined") return [];

      try {
        const stored = localStorage.getItem(
          SEARCH_CONSTANTS.RECENT_SEARCHES_STORAGE_KEY
        );
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    },
    staleTime: Infinity, // Never go stale
    gcTime: Infinity, // Never garbage collect
  });

  // Add a search term to recent searches
  const addRecentSearch = useMutation({
    mutationFn: async (searchTerm: string): Promise<string[]> => {
      if (!searchTerm.trim()) return recentSearches;

      const current = recentSearches || [];
      const updated = [
        searchTerm.trim(),
        ...current
          .filter((term: string) => term !== searchTerm.trim())
          .slice(0, SEARCH_CONSTANTS.RECENT_SEARCHES_LIMIT - 1),
      ];

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            SEARCH_CONSTANTS.RECENT_SEARCHES_STORAGE_KEY,
            JSON.stringify(updated)
          );
        } catch {
          // Ignore localStorage errors
        }
      }

      return updated;
    },
    onSuccess: (updated: string[]) => {
      queryClient.setQueryData(searchQueryKeys.recent(), updated);
    },
  });

  // Clear all recent searches
  const clearRecentSearches = useMutation({
    mutationFn: async (): Promise<string[]> => {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(SEARCH_CONSTANTS.RECENT_SEARCHES_STORAGE_KEY);
        } catch {
          // Ignore localStorage errors
        }
      }
      return [];
    },
    onSuccess: () => {
      queryClient.setQueryData(searchQueryKeys.recent(), []);
    },
  });

  return {
    recentSearches,
    addRecentSearch: addRecentSearch.mutate,
    clearRecentSearches: clearRecentSearches.mutate,
    isAdding: addRecentSearch.isPending,
    isClearing: clearRecentSearches.isPending,
  };
}

/**
 * Hook for prefetching search results for better UX
 */
export function usePrefetchSearch() {
  const queryClient = useQueryClient();

  return useMemo(() => {
    return (searchParams: SearchParams) => {
      if (
        !searchParams.q?.trim() ||
        searchParams.q.length < SEARCH_CONSTANTS.MIN_QUERY_LENGTH
      ) {
        return;
      }

      queryClient.prefetchQuery({
        queryKey: createSearchKey(searchParams),
        queryFn: async (): Promise<SearchResult[]> => {
          const response = await searchClient.searchAll(searchParams);
          return searchClient.transformResults(response);
        },
        staleTime: searchConfig.staleTime,
      });
    };
  }, [queryClient]);
}

/**
 * Hook to invalidate all search queries (useful after data changes)
 */
export function useInvalidateSearch() {
  const queryClient = useQueryClient();

  return useMemo(() => {
    return {
      invalidateAll: () =>
        queryClient.invalidateQueries({ queryKey: searchQueryKeys.all }),
      invalidateSearches: () =>
        queryClient.invalidateQueries({ queryKey: searchQueryKeys.searches() }),
      invalidateRecent: () =>
        queryClient.invalidateQueries({ queryKey: searchQueryKeys.recent() }),
    };
  }, [queryClient]);
}
