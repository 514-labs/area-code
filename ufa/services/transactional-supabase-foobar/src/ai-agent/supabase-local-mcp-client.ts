import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioClientTransport } from "ai/mcp-stdio";

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;
type McpToolSet = Awaited<ReturnType<MCPClient["tools"]>>;

export async function getSupabaseLocalMCPClient(): Promise<{
  mcpClient: MCPClient;
  tools: McpToolSet;
}> {
  // Default connection string for local Supabase instance
  const defaultConnectionString =
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

  // Allow override via environment variable if needed
  const connectionString =
    process.env.LOCAL_SUPABASE_DB_URL || defaultConnectionString;

  console.log("Starting PostgreSQL MCP server for local Supabase...");
  console.log(
    `Connecting to: ${connectionString.replace(/postgres:postgres/, "postgres:***")}`
  );

  const mcpClient = await createMCPClient({
    name: "supabase-local-postgres-mcp",
    transport: new StdioClientTransport({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres", connectionString],
    }),
  });

  // Get tools from PostgreSQL MCP server
  const tools = await mcpClient.tools();

  console.log("Local Supabase PostgreSQL MCP server connected successfully");

  return { mcpClient, tools };
}
