import type { Foo, Bar } from "@workspace/models";
import { esClient } from "../elasticsearch/client";
import { FOO_INDEX, BAR_INDEX } from "../elasticsearch/indices";

export interface SearchOptions {
  query: string;
  filters?: Record<string, any>;
  from?: number;
  size?: number;
  sort?: Array<{ [key: string]: "asc" | "desc" | string }>;
}

export interface SearchResult<T> {
  hits: Array<{
    _id: string;
    _score: number | null;
    _source: T;
  }>;
  total: {
    value: number;
    relation: "eq" | "gte";
  };
  took: number;
}

// Search for Foos
export async function searchFoos(
  options: SearchOptions
): Promise<SearchResult<Foo>> {
  const { query, filters = {}, from = 0, size = 10, sort } = options;

  const searchBody: any = {
    from,
    size,
    query: {
      bool: {
        must: [],
        filter: [],
      },
    },
  };

  // Add text search if query is provided
  if (query && query.trim()) {
    searchBody.query.bool.must.push({
      multi_match: {
        query: query.trim(),
        fields: ["name^2", "description"],
        type: "best_fields",
        fuzziness: "AUTO",
      },
    });
  }

  // Add filters
  Object.entries(filters).forEach(([field, value]) => {
    if (value !== undefined && value !== null) {
      searchBody.query.bool.filter.push({
        term: { [field]: value },
      });
    }
  });

  // Add sorting
  if (sort) {
    searchBody.sort = sort;
  }

  const response = await esClient.search({
    index: FOO_INDEX,
    body: searchBody,
  });

  return {
    hits: response.hits.hits.map((hit: any) => ({
      _id: hit._id,
      _score: hit._score,
      _source: hit._source,
    })),
    total: response.hits.total as any,
    took: response.took,
  };
}

// Search for Bars
export async function searchBars(
  options: SearchOptions
): Promise<SearchResult<Bar>> {
  const { query, filters = {}, from = 0, size = 10, sort } = options;

  const searchBody: any = {
    from,
    size,
    query: {
      bool: {
        must: [],
        filter: [],
      },
    },
  };

  // Add text search if query is provided
  if (query && query.trim()) {
    searchBody.query.bool.must.push({
      multi_match: {
        query: query.trim(),
        fields: ["label^2", "notes"],
        type: "best_fields",
        fuzziness: "AUTO",
      },
    });
  }

  // Add filters
  Object.entries(filters).forEach(([field, value]) => {
    if (value !== undefined && value !== null) {
      searchBody.query.bool.filter.push({
        term: { [field]: value },
      });
    }
  });

  // Add sorting
  if (sort) {
    searchBody.sort = sort;
  }

  const response = await esClient.search({
    index: BAR_INDEX,
    body: searchBody,
  });

  return {
    hits: response.hits.hits.map((hit: any) => ({
      _id: hit._id,
      _score: hit._score,
      _source: hit._source,
    })),
    total: response.hits.total as any,
    took: response.took,
  };
}

// Search across both indices
export async function searchAll(options: SearchOptions): Promise<{
  foos: SearchResult<Foo>;
  bars: SearchResult<Bar>;
}> {
  const [foos, bars] = await Promise.all([
    searchFoos(options),
    searchBars(options),
  ]);

  return { foos, bars };
}

// Index a Foo document
export async function indexFoo(foo: Foo): Promise<void> {
  await esClient.index({
    index: FOO_INDEX,
    id: foo.id,
    body: foo,
    refresh: true,
  });
}

// Index a Bar document
export async function indexBar(bar: Bar): Promise<void> {
  await esClient.index({
    index: BAR_INDEX,
    id: bar.id,
    body: bar,
    refresh: true,
  });
}

// Bulk index documents
export async function bulkIndex(foos: Foo[], bars: Bar[]): Promise<void> {
  const operations: any[] = [];

  // Add foo operations
  foos.forEach((foo) => {
    operations.push({ index: { _index: FOO_INDEX, _id: foo.id } });
    operations.push(foo);
  });

  // Add bar operations
  bars.forEach((bar) => {
    operations.push({ index: { _index: BAR_INDEX, _id: bar.id } });
    operations.push(bar);
  });

  if (operations.length > 0) {
    await esClient.bulk({
      body: operations,
      refresh: true,
    });
  }
}
