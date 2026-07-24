import { retrieveChunks, passesThreshold } from '@/lib/retrieval';
import { buildPrompt } from '@/lib/prompt';
import { streamAnswer } from '@/lib/gemini';

const REFUSAL = "I couldn't find that in the document.";

export async function POST(req: Request) {
  const { question, documentId } = await req.json();
  if (!question || !documentId) {
    return Response.json({ error: 'question and documentId required' }, { status: 400 });
  }

  const results = await retrieveChunks(question, documentId);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        if (!passesThreshold(results)) {
          // Hallucination guard layer 1: refuse before the LLM is ever called
          send({ token: REFUSAL });
          send({ done: true, refused: true });
        } else {
          const prompt = buildPrompt(question, results.map((r) => r.text));
          for await (const token of streamAnswer(prompt)) send({ token });
          send({ done: true });
        }
      } catch (err) {
        send({ error: err instanceof Error ? err.message : 'stream failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
