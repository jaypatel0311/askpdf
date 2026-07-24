import { GoogleGenAI } from '@google/genai';

export const EMBEDDING_DIMS = 768;
const BATCH_SIZE = 100;

let client: GoogleGenAI | undefined;
function ai(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  return (client ??= new GoogleGenAI({ apiKey }));
}

const embeddingModel = () => process.env.EMBEDDING_MODEL ?? 'text-embedding-004';
const chatModel = () => process.env.CHAT_MODEL ?? 'gemini-2.5-flash';

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const res = await ai().models.embedContent({
      model: embeddingModel(),
      contents: texts.slice(i, i + BATCH_SIZE),
      config: { outputDimensionality: EMBEDDING_DIMS },
    });
    vectors.push(...(res.embeddings ?? []).map((e) => e.values as number[]));
  }
  if (vectors.length !== texts.length) {
    throw new Error(`Embedding count mismatch: sent ${texts.length}, got ${vectors.length}`);
  }
  return vectors;
}

export async function embedQuery(question: string): Promise<number[]> {
  return (await embedTexts([question]))[0];
}

export async function* streamAnswer(prompt: string): AsyncGenerator<string> {
  const stream = await ai().models.generateContentStream({
    model: chatModel(),
    contents: prompt,
  });
  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}
