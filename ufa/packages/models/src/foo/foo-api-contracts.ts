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

// Rolling time-series with multi-dimensional segmentation
export type GetFooRollingSegmentationParams = {
  days?: number;
  windowDays?: number;
};

export type FooRollingSegmentationPoint = {
  date: string;
  status: string;
  tag: string;
  avgScoreRolling: number;
  volatilityRolling: number;
  usersRolling: number;
};

export type GetFooRollingSegmentationResponse = {
  data: FooRollingSegmentationPoint[];
  queryTime: number;
};

// High-dimensional cube aggregations
export type GetFooCubeAggregationsParams = {
  months?: number; // how many recent months to include
  status?: string; // optional filter
  tag?: string; // optional filter
  priority?: number; // optional filter
  includeTotals?: boolean; // include CUBE subtotal rows (NULLs) when true
  limit?: number; // max rows returned
  offset?: number; // pagination offset
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
  };
};

// Filter values API
export type GetFooFiltersValuesParams = {
  months?: number; // how many recent months to include
};

export type GetFooFiltersValuesResponse = {
  status: string[];
  tags: string[];
};

// Total count API for cube aggregations
export type GetFooCubeAggregationsTotalParams = Omit<
  GetFooCubeAggregationsParams,
  "limit" | "offset" | "sortBy" | "sortOrder"
>;

export type GetFooCubeAggregationsTotalResponse = {
  total: number;
};
