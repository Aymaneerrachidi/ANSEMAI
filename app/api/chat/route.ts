import { answerQuestion } from "@/lib/answer-engine";
import { getConfig } from "@/lib/config-store";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";

const MAX_MESSAGE_LENGTH = 2000;

function streamPayload(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(clientKeyFromHeaders(request.headers));
  if (!rateLimit.allowed) {
    return new Response("Too many requests. Please slow down.", {
      status: 429,
      headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
    });
  }

  const { message } = (await request.json()) as { message?: string };

  if (!message?.trim()) {
    return new Response("Missing message", { status: 400 });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return new Response(`Message too long (max ${MAX_MESSAGE_LENGTH} characters).`, { status: 413 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const config = await getConfig();
        const answer = await answerQuestion(config, message.trim());
        const words = answer.text.split(/(\s+)/);

        for (const word of words) {
          controller.enqueue(encoder.encode(streamPayload({ type: "chunk", value: word })));
          await new Promise((resolve) => setTimeout(resolve, 8));
        }

        controller.enqueue(encoder.encode(streamPayload({ type: "sources", value: answer.sources })));
        controller.enqueue(encoder.encode(streamPayload({ type: "done" })));
      } catch {
        controller.enqueue(
          encoder.encode(
            streamPayload({
              type: "chunk",
              value: "I couldn't verify this from official sources. The assistant service hit an internal error."
            })
          )
        );
        controller.enqueue(encoder.encode(streamPayload({ type: "done" })));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
