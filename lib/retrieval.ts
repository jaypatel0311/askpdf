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

// Whole-document questions bypass vector search; cap context at the first N chunks
const SUMMARY_CHUNK_LIMIT = 8;

export async function getChunksInOrder(
  documentId: string,
  limit = SUMMARY_CHUNK_LIMIT,
): Promise<RetrievedChunk[]> {
  const { chunks } = await getCollections();
  return (await chunks
    .find({ documentId })
    .sort({ chunkIndex: 1 })
    .limit(limit)
    .project({ _id: 0, text: 1, chunkIndex: 1 })
    .toArray()) as RetrievedChunk[];
}

// Words that can appear in a whole-document question without making it "pointed"
const SUMMARY_FILLER = new Set(
  `what is are this the it its a an of in on me my give provide tell say can could you please
   doc document pdf file paper text page pages content contents entire whole
   short brief briefly quick quickly describe explain does do
   summarize summarise summary overview gist tl;dr tldr tl dr main key points point idea ideas topic topics about`
    .split(/\s+/),
);

const SUMMARY_KEYWORD = /(summar|overview|tl;?dr|main points|key points|gist|about)/;

export function isSummaryQuestion(question: string): boolean {
  const normalized = question.toLowerCase().replace(/[^a-z;\s]/g, ' ');
  if (!SUMMARY_KEYWORD.test(normalized)) return false;
  // Summary keyword + nothing but filler = a question about the whole document.
  // Any substantive leftover word ("...the section about FSA") makes it pointed.
  return normalized.split(/\s+/).every((word) => !word || SUMMARY_FILLER.has(word));
}

export function passesThreshold(
  results: RetrievedChunk[],
  threshold = Number(process.env.SIM_THRESHOLD ?? 0.7),
): boolean {
  return results.length > 0 && results[0].score >= threshold;
}
