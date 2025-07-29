import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioClientTransport } from "ai/mcp-stdio";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { execSync } from "child_process";

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;
type McpToolSet = Awaited<ReturnType<MCPClient["tools"]>>;

function findAnalyticalMooseServicePath(): string {
  // Start from current service and navigate to workspace root, then to analytical service
  const currentServiceDir = path.resolve(__dirname, "../..");
  const workspaceRoot = path.resolve(currentServiceDir, "../../..");
  const analyticalServicePath = path.resolve(
    workspaceRoot,
    "ufa/services/analytical-moose-foobar"
  );

  // Verify the path exists and has a moose.config.toml
  const configPath = path.join(analyticalServicePath, "moose.config.toml");
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Analytical Moose service not found at ${analyticalServicePath}. Expected moose.config.toml at ${configPath}`
    );
  }

  return analyticalServicePath;
}

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

export async function getAuroraMCPClient(): Promise<{
  mcpClient: MCPClient;
  tools: McpToolSet;
}> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const analyticalServicePath = findAnalyticalMooseServicePath();
  const toolPaths = getToolPaths();

  console.log("Using Aurora MCP server at:", analyticalServicePath);

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
