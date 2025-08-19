// Load environment variables first (before any other imports)
import { config as dotenvConfig } from "dotenv";
import path from "path";

// Load .env.development only in development mode
if (process.env.NODE_ENV === "development") {
  dotenvConfig({ path: path.resolve(process.cwd(), ".env.development") });
}

// Also load local .env for overrides
dotenvConfig({ path: path.resolve(process.cwd(), ".env") });

// Export task and workflow from the ETL module
export {
  supabaseCDCTask,
  supabaseCDCWorkflow,
} from "./etl/supabase-cdc/supabase-cdc-workflow";

export { triggerApi, terminateAPI } from "./apis/workflows";