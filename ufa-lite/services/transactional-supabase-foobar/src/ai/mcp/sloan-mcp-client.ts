import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioClientTransport } from "ai/mcp-stdio";
import {
  getAnthropicApiKey,
  getClickhouseDatabase,
  getClickhouseHost,
  getClickhousePassword,
  getClickhousePort,
  getClickhouseUser,
  getNodeEnv,
} from "../../env-vars.js";
import fs from "fs";
import { findAnalyticalMooseServicePath } from "./moose-location-utils.js";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;
type McpToolSet = Awaited<ReturnType<MCPClient["tools"]>>;

// Status enum for tracking bootstrap state
export enum SloanMCPStatus {
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
let sloanMCPCurrentStatus: SloanMCPStatus = SloanMCPStatus.NOT_STARTED;

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

async function createProductionSloanMCPClient(
  ANTHROPIC_API_KEY: string
): Promise<{
  mcpClient: MCPClient;
  tools: McpToolSet;
}> {
  const CLICKHOUSE_DATABASE = getClickhouseDatabase();
  const CLICKHOUSE_HOST = getClickhouseHost();
  const CLICKHOUSE_PASSWORD = getClickhousePassword();
  const CLICKHOUSE_PORT = getClickhousePort();
  const CLICKHOUSE_USER = getClickhouseUser();

  console.log("Creating Sloan MCP client with remote ClickHouse tools only");

  const mcpClient = await createMCPClient({
    name: "sloan-mcp",
    transport: new StdioClientTransport({
      command: "npx",
      args: [
        "@514labs/sloan-mcp@latest",
        "--remote-clickhouse-tools",
        "--experimental-context",
      ],
      env: {
        ANTHROPIC_API_KEY,
        CLICKHOUSE_HOST: CLICKHOUSE_HOST,
        CLICKHOUSE_PORT: CLICKHOUSE_PORT,
        CLICKHOUSE_USER: CLICKHOUSE_USER,
        CLICKHOUSE_PASSWORD: CLICKHOUSE_PASSWORD,
        CLICKHOUSE_DATABASE: CLICKHOUSE_DATABASE,
      },
    }),
  });

  const tools = await mcpClient.tools();

  return { mcpClient, tools };
}

async function createDevelopmentSloanMCPClient(
  ANTHROPIC_API_KEY: string
): Promise<{
  mcpClient: MCPClient;
  tools: McpToolSet;
}> {
  const analyticalServicePath = findAnalyticalMooseServicePath(__dirname);
  const toolPaths = getToolPaths();

  console.log("Creating Sloan MCP client at:", analyticalServicePath);

  const mcpClient = await createMCPClient({
    name: "sloan-mcp",
    transport: new StdioClientTransport({
      command: "npx",
      args: [
        "@514labs/sloan-mcp@latest",
        "--moose-read-tools",
        "--remote-clickhouse-tools",
        analyticalServicePath,
      ],
      env: {
        ANTHROPIC_API_KEY,
        CLICKHOUSE_DATABASE: "",
        CLICKHOUSE_HOST: "",
        CLICKHOUSE_PASSWORD: "",
        CLICKHOUSE_PORT: "",
        CLICKHOUSE_USER: "",
        ...toolPaths,
      },
    }),
  });

  // Get tools from Sloan MCP server
  const tools = await mcpClient.tools();

  return { mcpClient, tools };
}

async function createSloanMCPClient(): Promise<{
  mcpClient: MCPClient;
  tools: McpToolSet;
}> {
  const ANTHROPIC_API_KEY = getAnthropicApiKey();

  if (getNodeEnv() === "production") {
    return createProductionSloanMCPClient(ANTHROPIC_API_KEY);
  } else {
    return createDevelopmentSloanMCPClient(ANTHROPIC_API_KEY);
  }
}

/**
 * Will not throw errors - server can continue running even if Sloan MCP fails to bootstrap.
 */
export async function bootstrapSloanMCPClient(): Promise<void> {
  if (mcpClientInstance) {
    console.log("Sloan MCP client already bootstrapped");
    return;
  }

  if (initializationPromise) {
    console.log("Sloan MCP client bootstrap in progress, waiting...");
    try {
      await initializationPromise;
    } catch (error) {
      console.log("Bootstrap attempt completed with failure");
    }
    return;
  }

  console.log("Bootstrapping Sloan MCP client...");
  sloanMCPCurrentStatus = SloanMCPStatus.IN_PROGRESS;

  initializationPromise = createSloanMCPClient();

  try {
    mcpClientInstance = await initializationPromise;
    sloanMCPCurrentStatus = SloanMCPStatus.SUCCESS;
    console.log("✅ Sloan MCP client successfully bootstrapped");
  } catch (error) {
    sloanMCPCurrentStatus = SloanMCPStatus.FAILED;
    console.warn(
      "⚠️ Failed to bootstrap Sloan MCP client - server will continue without Sloan MCP tools:",
      error
    );
    initializationPromise = null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type EmptyMcpToolSet = {};

export async function getSloanMCPClient(): Promise<{
  mcpClient: MCPClient | null;
  tools: McpToolSet | EmptyMcpToolSet;
}> {
  if (!mcpClientInstance) {
    if (initializationPromise) {
      // Bootstrap is in progress, wait for it
      console.log("Sloan MCP client not ready, waiting for bootstrap...");
      try {
        mcpClientInstance = await initializationPromise;
      } catch (error) {
        // If bootstrap failed, return the fallback
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(
          `Sloan MCP client bootstrap failed, returning null client: ${errorMessage}`
        );
        return { mcpClient: null, tools: {} };
      }
    } else {
      // Client was never bootstrapped or failed to bootstrap
      console.log("Sloan MCP client not available, returning null client");
      return { mcpClient: null, tools: {} };
    }
  }

  return mcpClientInstance;
}

export function getSloanMCPStatus(): {
  status: SloanMCPStatus;
  isAvailable: boolean;
} {
  return {
    status: sloanMCPCurrentStatus,
    isAvailable:
      sloanMCPCurrentStatus === SloanMCPStatus.SUCCESS &&
      mcpClientInstance !== null,
  };
}

export async function shutdownSloanMCPClient(): Promise<void> {
  if (!mcpClientInstance) {
    console.log("Sloan MCP client not initialized, nothing to shutdown");
    return;
  }

  console.log("Shutting down Sloan MCP client...");
  try {
    // Close the MCP client connection
    await mcpClientInstance.mcpClient.close();
    console.log("✅ Sloan MCP client successfully shut down");
  } catch (error) {
    console.error("❌ Error shutting down Sloan MCP client:", error);
  } finally {
    mcpClientInstance = null;
    initializationPromise = null;
    sloanMCPCurrentStatus = SloanMCPStatus.NOT_STARTED;
  }
}
