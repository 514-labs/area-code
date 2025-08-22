import { Foo, FooWithCDC } from "./foo";

export type GetFoosParams = {
  limit?: number;
  offset?: number;
  sortBy?: keyof Foo;
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
};

export type GetFoosResponse = {
  data: Foo[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  queryTime: number;
};

export type GetFoosWithCDCParams = Omit<GetFoosParams, "sortBy"> & {
  sortBy?: keyof FooWithCDC;
};

// Use FooWithCDC but replace enum with string for OpenAPI compatibility
export type FooWithCDCForConsumption = Omit<FooWithCDC, "status"> & {
  status: string;
};

export type GetFoosWithCDCResponse = Omit<GetFoosResponse, "data"> & {
  data: FooWithCDC[];
};

export type GetFoosWithCDCForConsumptionResponse = Omit<
  GetFoosResponse,
  "data"
> & {
  data: FooWithCDCForConsumption[];
};

export type GetFoosAverageScoreResponse = {
  averageScore: number;
  queryTime: number;
  count: number;
};

export type GetFoosScoreOverTimeParams = {
  days?: number;
};

export type FoosScoreOverTimeDataPoint = {
  date: string;
  averageScore: number;
  totalCount: number;
};

export type GetFoosScoreOverTimeResponse = {
  data: FoosScoreOverTimeDataPoint[];
  queryTime: number;
};

export type GetFooCubeAggregationsParams = {
  months?: number;
  status?: string;
  tag?: string;
  priority?: number;
  limit?: number;
  offset?: number;
  sortBy?:
    | "month"
    | "status"
    | "tag"
    | "priority"
    | "n"
    | "avgScore"
    | "p50"
    | "p90";
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
};

export type FooCubeAggregationRow = {
  month: string | null;
  status: string | null;
  tag: string | null;
  priority: number | null;
  n: number;
  avgScore: number;
  p50: number;
  p90: number;
};

export type GetFooCubeAggregationsResponse = {
  data: FooCubeAggregationRow[];
  queryTime: number;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type GetFooFiltersValuesParams = {
  months?: number;
};

export type GetFooFiltersValuesResponse = {
  status: string[];
  tags: string[];
  priorities: number[];
};
