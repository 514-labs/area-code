import { FastifyInstance } from "fastify";
import {
  UIMessage,
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { getAnthropicAgentStreamTextOptions } from "../ai/agent/anthropic-agent";

interface ChatBody {
  messages: UIMessage[];
}

export async function chatRoutes(fastify: FastifyInstance) {
  // Endpoint to check if Anthropic key is available
  fastify.get("/chat/status", async () => {
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

    return {
      anthropicKeyAvailable: hasAnthropicKey,
      status: hasAnthropicKey ? "ready" : "missing_key",
    };
  });

  fastify.post<{
    Body: ChatBody;
    Reply: any;
  }>("/chat", async (request, reply) => {
    try {
      const { messages } = request.body;

      const streamTextOptions =
        await getAnthropicAgentStreamTextOptions(messages);

      let stepStartTime = Date.now();
      let stepCount = 0;

      // Create a UIMessage stream for streaming timing data
      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          const result = streamText({
            ...streamTextOptions,
            onStepFinish: async (stepResult) => {
              const stepEndTime = Date.now();
              const stepDuration = stepEndTime - stepStartTime;
              stepCount++;

              // Log timing and usage info for each step
              console.log("Step finished:", {
                stepNumber: stepCount,
                finishReason: stepResult.finishReason,
                usage: stepResult.usage,
                timestamp: stepResult.response?.timestamp,
                duration: `${stepDuration}ms`,
                toolCallsCount: stepResult.toolCalls?.length || 0,
                toolResultsCount: stepResult.toolResults?.length || 0,
              });

              // Stream timing data for each tool call as data parts
              if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
                stepResult.toolCalls.forEach((toolCall) => {
                  writer.write({
                    type: "data-tool-timing",
                    data: {
                      toolCallId: toolCall.toolCallId,
                      duration: stepDuration,
                      stepNumber: stepCount,
                      toolName: toolCall.toolName,
                    },
                  });
                  console.log(
                    `Streamed timing for ${toolCall.toolCallId}: ${stepDuration}ms`
                  );
                });
              }

              // Reset for next step
              stepStartTime = Date.now();
            },
          });

          // Merge the AI response stream with our custom data stream
          writer.merge(result.toUIMessageStream());
        },
      });

      return createUIMessageStreamResponse({ stream });
    } catch (error) {
      fastify.log.error("Chat error:", error);
      reply.status(500).send({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
