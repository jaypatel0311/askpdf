import { getCollections } from '../lib/mongo';
import { EMBEDDING_DIMS } from '../lib/gemini';

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
