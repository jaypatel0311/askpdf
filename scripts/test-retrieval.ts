import { retrieveChunks } from '../lib/retrieval';

const [documentId, ...q] = process.argv.slice(2);
if (!documentId || q.length === 0) {
  console.error('usage: tsx --env-file=.env.local scripts/test-retrieval.ts <documentId> <question...>');
  process.exit(1);
}
const results = await retrieveChunks(q.join(' '), documentId);
for (const r of results) console.log(r.score.toFixed(3), '—', r.text.slice(0, 100).replace(/\n/g, ' '));
process.exit(0);
