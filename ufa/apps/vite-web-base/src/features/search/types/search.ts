import type { Foo, Bar } from "@workspace/models";

// API Response Types (matching retrieval-base OpenAPI spec)
export interface SearchHit<T = Record<string, unknown>> {
  _id: string;
  _score: number | null;
  _source: T;
}

export interface SearchResponse<T = Record<string, unknown>> {
  hits: SearchHit<T>[];
  total: {
    value: number;
    relation: string;
  };
  took: number;
}

export interface CombinedSearchResponse {
  foos: SearchResponse<Foo>;
  bars: SearchResponse<Bar>;
}

// Search Parameters (matching retrieval-base query schema)
export interface SearchParams {
  q?: string;
  from?: number;
  size?: number;
  // Foo filters
  status?: string;
  priority?: number;
  isActive?: boolean;
  // Bar filters
  fooId?: string;
  isEnabled?: boolean;
  // Sorting
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// UI-friendly search result type
export interface SearchResult {
  id: string;
  type: "foo" | "bar";
  name: string;
  description?: string;
  score: number;
  metadata?: {
    // Foo metadata
    status?: string;
    priority?: number;
    isActive?: boolean;
    // Bar metadata
    fooId?: string;
    value?: number;
    isEnabled?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Search configuration
export interface SearchConfig {
  baseUrl: string;
  timeout: number;
  defaultPageSize: number;
  debounceMs: number;
  staleTime: number;
  gcTime: number;
}
