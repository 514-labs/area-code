import { FastifyInstance } from "fastify";
import { UIMessage, streamText } from "ai";
import { getAnthropicAgentStreamTextOptions } from "../ai/agent/anthropic-agent";

interface ChatBody {
  messages: UIMessage[];
}

export async function chatRoutes(fastify: FastifyInstance) {
  // Endpoint to check if Anthropic key is available
  fastify.get("/chat/status", async (request, reply) => {
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

      const result = streamText(streamTextOptions);

      return result.toUIMessageStreamResponse();
    } catch (error) {
      fastify.log.error("Chat error:", error);
      reply.status(500).send({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
