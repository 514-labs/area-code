import { AnthropicProviderOptions, createAnthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, UIMessage } from "ai";
import { getAuroraMCPClient } from "./aurora-mcp-client";
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

  // Get Aurora MCP client and tools
  const { tools } = await getAuroraMCPClient();

  // Convert UIMessages to ModelMessages
  const modelMessages = convertToModelMessages(messages);

  return {
    model: anthropic("claude-3-5-sonnet-20241022"),
    system: getAISystemPrompt(),
    messages: modelMessages,
    tools,
    // providerOptions: {
    //   anthropic: {
    //     thinking: { type: "enabled", budgetTokens: 12000 },
    //   } satisfies AnthropicProviderOptions,
    // },
  };
}
