import { Bar, BarWithCDC } from "./bar";

export type GetBarsParams = {
  limit?: number;
  offset?: number;
  sortBy?: keyof Bar;
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
};

export type GetBarsResponse = {
  data: Bar[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
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
