import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioClientTransport } from "ai/mcp-stdio";

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;
type McpToolSet = Awaited<ReturnType<MCPClient["tools"]>>;

// Singleton instance storage
let mcpClientInstance: {
  mcpClient: MCPClient;
  tools: McpToolSet;
} | null = null;

let initializationPromise: Promise<{
  mcpClient: MCPClient;
  tools: McpToolSet;
}> | null = null;

async function createSupabaseLocalMCPClient(): Promise<{
  mcpClient: MCPClient;
  tools: McpToolSet;
}> {
  // Default connection string for local Supabase instance
  const defaultConnectionString =
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

  // Allow override via environment variable if needed
  const connectionString =
    process.env.LOCAL_SUPABASE_DB_URL || defaultConnectionString;

  console.log("Creating PostgreSQL MCP client for local Supabase...");
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

  console.log("Local Supabase PostgreSQL MCP client connected successfully");

  return { mcpClient, tools };
}

/**
 * Bootstrap the Supabase Local MCP client during server startup.
 * Should be called once when the server starts.
 */
export async function bootstrapSupabaseLocalMCPClient(): Promise<void> {
  if (mcpClientInstance) {
    console.log("Supabase Local MCP client already bootstrapped");
    return;
  }

  if (initializationPromise) {
    console.log("Supabase Local MCP client bootstrap in progress, waiting...");
    await initializationPromise;
    return;
  }

  console.log("Bootstrapping Supabase Local MCP client...");
  initializationPromise = createSupabaseLocalMCPClient();

  try {
    mcpClientInstance = await initializationPromise;
    console.log("✅ Supabase Local MCP client successfully bootstrapped");
  } catch (error) {
    console.error("❌ Failed to bootstrap Supabase Local MCP client:", error);
    initializationPromise = null;
    throw error;
  }
}

/**
 * Get the Supabase Local MCP client instance.
 * Returns the singleton instance created during bootstrap.
 */
export async function getSupabaseLocalMCPClient(): Promise<{
  mcpClient: MCPClient;
  tools: McpToolSet;
}> {
  if (!mcpClientInstance) {
    if (initializationPromise) {
      // Bootstrap is in progress, wait for it
      console.log(
        "Supabase Local MCP client not ready, waiting for bootstrap..."
      );
      mcpClientInstance = await initializationPromise;
    } else {
      throw new Error(
        "Supabase Local MCP client not bootstrapped. Call bootstrapSupabaseLocalMCPClient() during server startup."
      );
    }
  }

  return mcpClientInstance;
}

/**
 * Shutdown the Supabase Local MCP client during server shutdown.
 * Should be called once when the server is shutting down.
 */
export async function shutdownSupabaseLocalMCPClient(): Promise<void> {
  if (!mcpClientInstance) {
    console.log(
      "Supabase Local MCP client not initialized, nothing to shutdown"
    );
    return;
  }

  console.log("Shutting down Supabase Local MCP client...");
  try {
    // Close the MCP client connection
    await mcpClientInstance.mcpClient.close();
    console.log("✅ Supabase Local MCP client successfully shut down");
  } catch (error) {
    console.error("❌ Error shutting down Supabase Local MCP client:", error);
  } finally {
    mcpClientInstance = null;
    initializationPromise = null;
  }
}
