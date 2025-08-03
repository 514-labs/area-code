import { Bar, BarWithCDC, BarWithFoo } from "./bar";

export type GetBarsParams = {
  limit?: number;
  offset?: number;
  sortBy?: keyof Bar;
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
};

export type GetBarsResponse = {
  data: BarWithFoo[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  queryTime: number;
};

export type GetBarsWithCDCParams = Omit<GetBarsParams, "sortBy"> & {
  sortBy?: keyof BarWithCDC;
};

export type GetBarsWithCDCResponse = Omit<GetBarsResponse, "data"> & {
  data: BarWithCDC[];
};

export type GetBarsAverageValueResponse = {
  averageValue: number;
  queryTime: number;
  count: number;
};

export type BulkDeleteBarsRequest = {
  ids: string[];
};

export type BulkDeleteBarsResponse = {
  success: boolean;
  deletedCount: number;
};

export type DeleteBarResponse = {
  success: boolean;
};

export type GetBarsByFooIdResponse = Bar[];
