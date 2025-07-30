import type {
  SearchParams,
  CombinedSearchResponse,
  SearchResponse,
  SearchResult,
} from "../types/search";
import type { Foo, Bar } from "@workspace/models";
import { searchConfig } from "./search-config";

/**
 * API client for communicating with retrieval-elasticsearch-foobar service
 * Handles all search-related API calls and response transformation
 */
export class SearchClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl?: string, timeout?: number) {
    this.baseUrl = baseUrl || searchConfig.baseUrl;
    this.timeout = timeout || searchConfig.timeout;
  }

  /**
   * Make HTTP request to search API with proper error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    params: SearchParams
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Add query parameters, filtering out undefined/null values
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.append(key, String(value));
      }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Search failed: ${response.status} ${response.statusText}`
        );
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Search request timed out");
        }
        throw new Error(`Search failed: ${error.message}`);
      }

      throw new Error("Search failed: Unknown error");
    }
  }

  /**
   * Search across all entities (foos and bars)
   */
  async searchAll(params: SearchParams): Promise<CombinedSearchResponse> {
    return this.makeRequest<CombinedSearchResponse>("/api/search", params);
  }

  /**
   * Search only Foo entities
   */
  async searchFoos(params: SearchParams): Promise<SearchResponse<Foo>> {
    return this.makeRequest<SearchResponse<Foo>>("/api/search/foos", params);
  }

  /**
   * Search only Bar entities
   */
  async searchBars(params: SearchParams): Promise<SearchResponse<Bar>> {
    return this.makeRequest<SearchResponse<Bar>>("/api/search/bars", params);
  }

  /**
   * Transform raw API response into UI-friendly format
   * Combines results from both foos and bars into a unified SearchResult array
   */
  transformResults(response: CombinedSearchResponse): SearchResult[] {
    const results: SearchResult[] = [];

    // Transform Foo results
    if (response.foos?.hits) {
      results.push(
        ...response.foos.hits.map((hit) => ({
          id: hit._id,
          type: "foo" as const,
          name: hit._source.name,
          description: hit._source.description || undefined,
          score: hit._score || 0,
          metadata: {
            status: hit._source.status,
            priority: hit._source.priority,
            isActive: hit._source.is_active,
          },
          createdAt: hit._source.created_at?.toString(),
          updatedAt: hit._source.updated_at?.toString(),
        }))
      );
    }

    // Transform Bar results
    if (response.bars?.hits) {
      results.push(
        ...response.bars.hits.map((hit) => ({
          id: hit._id,
          type: "bar" as const,
          name: hit._source.label || `Bar ${hit._source.id}`,
          description: hit._source.notes || undefined,
          score: hit._score || 0,
          metadata: {
            fooId: hit._source.foo_id,
            value: hit._source.value,
            isEnabled: hit._source.is_enabled,
          },
          createdAt: hit._source.created_at?.toString(),
          updatedAt: hit._source.updated_at?.toString(),
        }))
      );
    }

    // Sort by score descending, then by name for consistent ordering
    return results.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Transform single-type search response (for specific entity searches)
   */
  transformSingleTypeResults<T extends Foo | Bar>(
    response: SearchResponse<T>,
    type: "foo" | "bar"
  ): SearchResult[] {
    if (!response.hits) return [];

    return response.hits
      .map((hit) => {
        if (type === "foo") {
          const source = hit._source as Foo;
          return {
            id: hit._id,
            type: "foo" as const,
            name: source.name,
            description: source.description || undefined,
            score: hit._score || 0,
            metadata: {
              status: source.status,
              priority: source.priority,
              isActive: source.is_active,
            },
            createdAt: source.created_at?.toString(),
            updatedAt: source.updated_at?.toString(),
          };
        } else {
          const source = hit._source as Bar;
          return {
            id: hit._id,
            type: "bar" as const,
            name: source.label || `Bar ${source.id}`,
            description: source.notes || undefined,
            score: hit._score || 0,
            metadata: {
              fooId: source.foo_id,
              value: source.value,
              isEnabled: source.is_enabled,
            },
            createdAt: source.created_at?.toString(),
            updatedAt: source.updated_at?.toString(),
          };
        }
      })
      .sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        return a.name.localeCompare(b.name);
      });
  }
}

// Default search client instance
export const searchClient = new SearchClient();
