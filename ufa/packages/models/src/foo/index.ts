export * from "./foo-api-contracts.js";
export * from "./foo.js";

// Explicit exports for better ES module compatibility
export { FooStatus } from "./foo.js";
export type { 
  Foo, 
  FooWithCDC, 
  CreateFoo, 
  UpdateFoo
} from "./foo.js";
export type {
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
} from "./foo-api-contracts.js";
