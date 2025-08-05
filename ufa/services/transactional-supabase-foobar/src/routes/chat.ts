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

      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          stepStartTime = Date.now();

          const result = streamText({
            ...streamTextOptions,
            onStepFinish: async (stepResult) => {
              const stepEndTime = Date.now();
              const stepDuration = stepEndTime - stepStartTime;
              stepCount++;

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
                });
              }

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
