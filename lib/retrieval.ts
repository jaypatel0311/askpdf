import { embedQuery } from './gemini';
import { getCollections } from './mongo';

export interface RetrievedChunk {
  text: string;
  chunkIndex: number;
  score: number; // Atlas cosine score, normalized to [0, 1]
}

const TOP_K = 4;

export async function retrieveChunks(question: string, documentId: string): Promise<RetrievedChunk[]> {
  const queryVector = await embedQuery(question);
  const { chunks } = await getCollections();
  return (await chunks
    .aggregate([
      {
        $vectorSearch: {
          index: 'chunks_vector',
          path: 'embedding',
          queryVector,
          numCandidates: 100,
          limit: TOP_K,
          filter: { documentId },
        },
      },
      { $project: { _id: 0, text: 1, chunkIndex: 1, score: { $meta: 'vectorSearchScore' } } },
    ])
    .toArray()) as RetrievedChunk[];
}

export function passesThreshold(
  results: RetrievedChunk[],
  threshold = Number(process.env.SIM_THRESHOLD ?? 0.7),
): boolean {
  return results.length > 0 && results[0].score >= threshold;
}
