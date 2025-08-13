import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioClientTransport } from "ai/mcp-stdio";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;
type McpToolSet = Awaited<ReturnType<MCPClient["tools"]>>;

// Status enum for tracking bootstrap state
export enum AuroraMCPStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  SUCCESS = "success",
  FAILED = "failed",
}

// Singleton instance storage
let mcpClientInstance: {
  mcpClient: MCPClient;
  tools: McpToolSet;
} | null = null;

let initializationPromise: Promise<{
  mcpClient: MCPClient;
  tools: McpToolSet;
}> | null = null;

// Track the current status of the MCP client
let auroraMCPCurrentStatus: AuroraMCPStatus = AuroraMCPStatus.NOT_STARTED;

function getClickhouseEnvVars() {
  // todo : once auth PR is merged, this can be moved to the env-vars.ts file
  if (!process.env.CLICKHOUSE_DATABASE) {
    throw new Error("CLICKHOUSE_DATABASE environment variable is not set");
  }
  if (!process.env.CLICKHOUSE_HOST) {
    throw new Error("CLICKHOUSE_HOST environment variable is not set");
  }
  if (!process.env.CLICKHOUSE_PASSWORD) {
    throw new Error("CLICKHOUSE_PASSWORD environment variable is not set");
  }
  if (!process.env.CLICKHOUSE_PORT) {
    throw new Error("CLICKHOUSE_PORT environment variable is not set");
  }
  if (!process.env.CLICKHOUSE_USER) {
    throw new Error("CLICKHOUSE_USER environment variable is not set");
  }

  return {
    CLICKHOUSE_DATABASE: process.env.CLICKHOUSE_DATABASE,
    CLICKHOUSE_HOST: process.env.CLICKHOUSE_HOST,
    CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD,
    CLICKHOUSE_PORT: process.env.CLICKHOUSE_PORT,
    CLICKHOUSE_USER: process.env.CLICKHOUSE_USER,
  };
}

async function createAuroraMCPClient(): Promise<{
  mcpClient: MCPClient;
  tools: McpToolSet;
}> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const {
    CLICKHOUSE_DATABASE,
    CLICKHOUSE_HOST,
    CLICKHOUSE_PASSWORD,
    CLICKHOUSE_PORT,
    CLICKHOUSE_USER,
  } = getClickhouseEnvVars();

  console.log("ClickHouse config:", {
    CLICKHOUSE_DATABASE,
    CLICKHOUSE_HOST,
    CLICKHOUSE_PASSWORD,
    CLICKHOUSE_PORT,
    CLICKHOUSE_USER,
  });

  console.log("Creating Aurora MCP client with remote ClickHouse tools only");

  const mcpClient = await createMCPClient({
    name: "aurora-mcp",
    transport: new StdioClientTransport({
      command: "npx",
      args: [
        "@514labs/aurora-mcp@latest",
        "--remote-clickhouse-tools",
        "--experimental-context",
      ],
      env: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        BOREAL_CLICKHOUSE_HOST: CLICKHOUSE_HOST,
        BOREAL_CLICKHOUSE_PORT: CLICKHOUSE_PORT,
        BOREAL_CLICKHOUSE_USER: CLICKHOUSE_USER,
        BOREAL_CLICKHOUSE_PASSWORD: CLICKHOUSE_PASSWORD,
        BOREAL_CLICKHOUSE_DATABASE: CLICKHOUSE_DATABASE,
      },
    }),
  });

  const tools = await mcpClient.tools();

  return { mcpClient, tools };
}

/**
 * Will not throw errors - server can continue running even if Aurora MCP fails to bootstrap.
 */
export async function bootstrapAuroraMCPClient(): Promise<void> {
  if (mcpClientInstance) {
    console.log("Aurora MCP client already bootstrapped");
    return;
  }

  if (initializationPromise) {
    console.log("Aurora MCP client bootstrap in progress, waiting...");
    try {
      await initializationPromise;
    } catch (error) {
      console.log("Bootstrap attempt completed with failure");
    }
    return;
  }

  console.log("Bootstrapping Aurora MCP client...");
  auroraMCPCurrentStatus = AuroraMCPStatus.IN_PROGRESS;

  initializationPromise = createAuroraMCPClient();

  try {
    mcpClientInstance = await initializationPromise;
    auroraMCPCurrentStatus = AuroraMCPStatus.SUCCESS;
    console.log("✅ Aurora MCP client successfully bootstrapped");
  } catch (error) {
    auroraMCPCurrentStatus = AuroraMCPStatus.FAILED;
    console.warn(
      "⚠️ Failed to bootstrap Aurora MCP client - server will continue without Aurora MCP tools:",
      error
    );
    initializationPromise = null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type EmptyMcpToolSet = {};

export async function getAuroraMCPClient(): Promise<{
  mcpClient: MCPClient | null;
  tools: McpToolSet | EmptyMcpToolSet;
}> {
  if (!mcpClientInstance) {
    if (initializationPromise) {
      // Bootstrap is in progress, wait for it
      console.log("Aurora MCP client not ready, waiting for bootstrap...");
      try {
        mcpClientInstance = await initializationPromise;
      } catch (error) {
        // If bootstrap failed, return the fallback
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(
          `Aurora MCP client bootstrap failed, returning null client: ${errorMessage}`
        );
        return { mcpClient: null, tools: {} };
      }
    } else {
      // Client was never bootstrapped or failed to bootstrap
      console.log("Aurora MCP client not available, returning null client");
      return { mcpClient: null, tools: {} };
    }
  }

  return mcpClientInstance;
}

export function getAuroraMCPStatus(): {
  status: AuroraMCPStatus;
  isAvailable: boolean;
} {
  return {
    status: auroraMCPCurrentStatus,
    isAvailable:
      auroraMCPCurrentStatus === AuroraMCPStatus.SUCCESS &&
      mcpClientInstance !== null,
  };
}

export async function shutdownAuroraMCPClient(): Promise<void> {
  if (!mcpClientInstance) {
    console.log("Aurora MCP client not initialized, nothing to shutdown");
    return;
  }

  console.log("Shutting down Aurora MCP client...");
  try {
    // Close the MCP client connection
    await mcpClientInstance.mcpClient.close();
    console.log("✅ Aurora MCP client successfully shut down");
  } catch (error) {
    console.error("❌ Error shutting down Aurora MCP client:", error);
  } finally {
    mcpClientInstance = null;
    initializationPromise = null;
    auroraMCPCurrentStatus = AuroraMCPStatus.NOT_STARTED;
  }
}
