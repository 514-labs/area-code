import { FastifyInstance } from "fastify";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages } from "ai";

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

      // Convert UIMessages to ModelMessages as suggested by the error
      const modelMessages = convertToModelMessages(messages);

      const result = streamText({
        model: anthropic("claude-3-5-sonnet-20241022"),
        system: "You are a helpful assistant.",
        messages: modelMessages,
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
