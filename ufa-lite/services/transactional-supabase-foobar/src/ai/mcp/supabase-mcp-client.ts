import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioClientTransport } from "ai/mcp-stdio";
import { getSupabaseConnectionString } from "../../env-vars";

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;
type McpToolSet = Awaited<ReturnType<MCPClient["tools"]>>;

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
  const connectionString = getSupabaseConnectionString();

  console.log("Creating PostgreSQL MCP client for postgres database...");

  const mcpClient = await createMCPClient({
    name: "supabase-local-postgres-mcp",
    transport: new StdioClientTransport({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres", connectionString],
    }),
  });

  const tools = await mcpClient.tools();

  console.log("Local Supabase PostgreSQL MCP client connected successfully");

  return { mcpClient, tools };
}

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
