import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioClientTransport } from "ai/mcp-stdio";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { execSync } from "child_process";
import { findAnalyticalMooseServicePath } from "./moose-location-utils.js";

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

function discoverToolPath(toolName: string): string | null {
  try {
    const result = execSync(`which ${toolName}`, { encoding: "utf8" }).trim();
    return result || null;
  } catch (error) {
    console.warn(`Could not find ${toolName} in PATH`);
    return null;
  }
}

function getToolPaths() {
  const moosePath = process.env.MOOSE_PATH || discoverToolPath("moose");
  const nodePath = process.env.NODE_PATH || discoverToolPath("node");
  const pythonPath = process.env.PYTHON_PATH || discoverToolPath("python");

  if (!moosePath) {
    console.warn(
      "MOOSE_PATH not found. Please install Moose CLI or set MOOSE_PATH environment variable"
    );
  }
  if (!nodePath) {
    console.warn(
      "NODE_PATH not found. Please install Node.js or set NODE_PATH environment variable"
    );
  }
  if (!pythonPath) {
    console.warn(
      "PYTHON_PATH not found. Please install Python or set PYTHON_PATH environment variable"
    );
  }

  return {
    MOOSE_PATH: moosePath || "",
    NODE_PATH: nodePath || "",
    PYTHON_PATH: pythonPath || "",
  };
}

async function createAuroraMCPClient(): Promise<{
  mcpClient: MCPClient;
  tools: McpToolSet;
}> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const analyticalServicePath = findAnalyticalMooseServicePath(__dirname);
  const toolPaths = getToolPaths();

  console.log("Creating Aurora MCP client at:", analyticalServicePath);

  const mcpClient = await createMCPClient({
    name: "aurora-mcp",
    transport: new StdioClientTransport({
      command: "npx",
      args: [
        "@514labs/aurora-mcp@latest",
        "--moose-read-tools",
        "--remote-clickhouse-tools",
        analyticalServicePath,
      ],
      env: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        CLICKHOUSE_DATABASE: process.env.CLICKHOUSE_DATABASE || "",
        CLICKHOUSE_HOST: process.env.CLICKHOUSE_HOST || "",
        CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD || "",
        CLICKHOUSE_PORT: process.env.CLICKHOUSE_PORT || "",
        CLICKHOUSE_USER: process.env.CLICKHOUSE_USER || "",
        ...toolPaths,
      },
    }),
  });

  // Get tools from Aurora MCP server
  const tools = await mcpClient.tools();

  return { mcpClient, tools };
}

/**
 * Should be called once when the server starts.
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

export async function getAuroraMCPClient(): Promise<{
  mcpClient: MCPClient | null;
  tools: McpToolSet | {};
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
