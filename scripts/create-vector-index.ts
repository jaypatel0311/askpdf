import { getCollections, getDb } from '../lib/mongo';
import { EMBEDDING_DIMS } from '../lib/gemini';

// The collection must exist before a search index can be created on it
const db = await getDb();
const existing = await db.listCollections({ name: 'chunks' }).toArray();
if (existing.length === 0) await db.createCollection('chunks');

const { chunks } = await getCollections();
await chunks.createSearchIndex({
  name: 'chunks_vector',
  type: 'vectorSearch',
  definition: {
    fields: [
      { type: 'vector', path: 'embedding', numDimensions: EMBEDDING_DIMS, similarity: 'cosine' },
      { type: 'filter', path: 'documentId' },
    ],
  },
});
console.log('vector index requested — Atlas builds it in ~1 minute');
process.exit(0);
