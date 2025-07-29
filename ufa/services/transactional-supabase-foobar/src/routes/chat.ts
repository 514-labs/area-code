import { FastifyInstance } from "fastify";
import { AnthropicProviderOptions, createAnthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages } from "ai";
import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioClientTransport } from "ai/mcp-stdio";

interface ChatBody {
  messages: any[];
}

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: ChatBody;
    Reply: any;
  }>("/chat", async (request, reply) => {
    try {
      const { messages } = request.body;

      // Create Anthropic client with API key
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY environment variable is not set");
      }

      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // Create MCP client to connect to Aurora MCP server
      console.log("Connecting to Aurora MCP server...");
      const mcpClient = await createMCPClient({
        name: "aurora-mcp",
        transport: new StdioClientTransport({
          command: "npx",
          args: [
            "@514labs/aurora-mcp@latest",
            "--moose-read-tools",
            "--moose-write-tools",
            "--remote-clickhouse-tools",
            "/Users/groy/repos/area-code/ufa/services/analytical-moose-foobar",
          ],
          env: {
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
            CLICKHOUSE_DATABASE: "",
            CLICKHOUSE_HOST: "",
            CLICKHOUSE_PASSWORD: "",
            CLICKHOUSE_PORT: "",
            CLICKHOUSE_USER: "",
            MOOSE_PATH: "/Users/groy/.moose/bin/moose",
            NODE_PATH: "/opt/homebrew/opt/node@22/bin/node",
            PYTHON_PATH: "/Users/groy/.pyenv/shims/python",
          },
        }),
      });

      // Get tools from Aurora MCP server
      console.log("Getting tools from Aurora MCP server...");
      const tools = await mcpClient.tools();
      console.log(
        `Found ${Object.keys(tools).length} Aurora MCP tools:`,
        Object.keys(tools)
      );

      // Convert UIMessages to ModelMessages
      const modelMessages = convertToModelMessages(messages);

      const result = streamText({
        model: anthropic("claude-3-5-sonnet-20241022"),
        system: `You are a specialized data assistant for the area-code repository. Your sole purpose is to help users understand and analyze data within this specific codebase using Aurora MCP tools.

WHAT YOU DO:
✅ Answer questions about the repository's services and databases using Aurora MCP tools
✅ Query ClickHouse analytics data (Foo table, Bar table, materialized views, etc.)
✅ Provide insights about Moose project structure, workflows, and data pipelines
✅ Analyze data models, stream functions, and egress APIs
✅ Help with database schemas, table structures, and data relationships
✅ Examine logs, events, and operational data within this repo

AVAILABLE DATA & SERVICES:
- UFA services: analytical-moose-foobar, sync-supabase-moose-foobar, transactional-supabase-foobar
- ClickHouse database with business analytics (local.Foo, local.Bar, local.foo_current_state)
- Moose data pipelines and materialized views
- Supabase transactional data
- RedPanda topics and streaming data

WHAT YOU DON'T DO:
❌ Answer general questions unrelated to this repository
❌ Provide information about external systems not connected to this codebase
❌ Help with topics outside of this repository's scope
❌ Act as a general-purpose AI assistant

IMPORTANT: If a user asks about anything not related to this repository's services, databases, or data, politely explain that you're specifically designed to work with this codebase's data and suggest they use a general-purpose AI assistant for other topics.

Use the Aurora MCP tools, when appropriate, to provide accurate, real-time information about the repository's data and services.`,
        messages: modelMessages,
        tools, // Use Aurora MCP tools directly!
        // providerOptions: {
        //   anthropic: {
        //     thinking: { type: "enabled", budgetTokens: 12000 },
        //   } satisfies AnthropicProviderOptions,
        // },
      });

      // Return the proper UI message stream response for DefaultChatTransport
      return result.toUIMessageStreamResponse();
    } catch (error) {
      console.error("Chat error:", error);
      reply.status(500).send({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
