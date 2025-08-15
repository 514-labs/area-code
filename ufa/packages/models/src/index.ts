export * from "./foo/index.js";
export * from "./bar/index.js";
export * from "./cdc.js";

// Explicit exports for better ES module compatibility
export { FooStatus } from "./foo/index.js";
export type { 
  Foo, 
  FooWithCDC, 
  CreateFoo, 
  UpdateFoo,
  GetFoosParams,
  GetFoosResponse,
  GetFoosWithCDCParams,
  FooWithCDCForConsumption,
  GetFoosWithCDCResponse,
  GetFoosWithCDCForConsumptionResponse,
  GetFoosAverageScoreResponse,
  GetFoosScoreOverTimeParams,
  FoosScoreOverTimeDataPoint,
  GetFoosScoreOverTimeResponse
} from "./foo/index.js";
