import { createOpenAI, openai } from "@ai-sdk/openai";
import { convertToModelMessages, UIMessage, stepCountIs } from "ai";
import { getAuroraMCPClient } from "../mcp/aurora-mcp-client";
import { getSupabaseLocalMCPClient } from "../mcp/supabase-mcp-client";
import { getAISystemPrompt } from "./ai-system-prompt";

export async function getC1AgentStreamTextOptions(
  messages: UIMessage[]
): Promise<any> {
  // Use Thesys model if key is present; otherwise, defer model selection to caller
  const thesys = process.env.THESYS_API_KEY
    ? createOpenAI({
        apiKey: process.env.THESYS_API_KEY,
        baseURL: "https://api.thesys.dev/v1/embed",
      }).chat
    : undefined;

  const { tools: auroraTools } = await getAuroraMCPClient();

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

  const allTools = {
    ...auroraTools,
    ...supabaseTools,
  };

  // Convert UIMessages to ModelMessages for AI SDK v5
  const modelMessages = convertToModelMessages(messages);

  return {
    // If Thesys is configured, include a default model; caller may override
    model: thesys
      ? thesys("c1/anthropic/claude-sonnet-4/v-20250815")
      : undefined,
    system: getAISystemPrompt(),
    messages: modelMessages,
    tools: allTools,
    toolChoice: "auto",
    // 👇 THIS is the correct way to enable multi-step in AI SDK v5!
    stopWhen: stepCountIs(25),
  };
}
