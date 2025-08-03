import { AnthropicProviderOptions, createAnthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, UIMessage, stepCountIs } from "ai";
import { getAuroraMCPClient } from "../mcp/aurora-mcp-client";
import { getSupabaseLocalMCPClient } from "../mcp/supabase-mcp-client";
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

  // Get Aurora MCP client (fault-tolerant - won't throw)
  const { tools: auroraTools } = await getAuroraMCPClient();

  // Get Supabase MCP client (may throw - handle gracefully)
  let supabaseTools = {};
  try {
    const { tools } = await getSupabaseLocalMCPClient();
    supabaseTools = tools;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      `⚠️ Supabase MCP client not available - continuing without Supabase tools: ${errorMessage}`
    );
    console.error("Full Supabase MCP error:", error);
  }

  // Combine tools from both MCP servers
  const allTools = {
    ...auroraTools,
    ...supabaseTools,
  };

  // Convert UIMessages to ModelMessages for AI SDK v5
  const modelMessages = convertToModelMessages(messages);

  return {
    model: anthropic("claude-3-5-sonnet-20241022"),
    system: getAISystemPrompt(),
    messages: modelMessages,
    tools: allTools,
    toolChoice: "auto",
    // 👇 THIS is the correct way to enable multi-step in AI SDK v5!
    stopWhen: stepCountIs(25),
  };
}
