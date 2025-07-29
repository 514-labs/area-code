import { AnthropicProviderOptions, createAnthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, UIMessage } from "ai";
import { getAuroraMCPClient } from "./aurora-mcp-client";
import { getSupabaseLocalMCPClient } from "./supabase-local-mcp-client";
import { getAISystemPrompt } from "./ai-system-prompt";

export async function getAnthropicAgentStreamTextOptions(
  messages: UIMessage[]
): Promise<any> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Get both Aurora MCP and local Supabase PostgreSQL MCP clients and tools
  const [{ tools: auroraTools }, { tools: supabaseTools }] = await Promise.all([
    getAuroraMCPClient(),
    getSupabaseLocalMCPClient(),
  ]);

  // Combine tools from both MCP servers
  const allTools = {
    ...auroraTools,
    ...supabaseTools,
  };

  // Convert UIMessages to ModelMessages
  const modelMessages = convertToModelMessages(messages);

  return {
    model: anthropic("claude-3-5-sonnet-20241022"),
    system: getAISystemPrompt(),
    messages: modelMessages,
    tools: allTools,
    // providerOptions: {
    //   anthropic: {
    //     thinking: { type: "enabled", budgetTokens: 12000 },
    //   } satisfies AnthropicProviderOptions,
    // },
  };
}
