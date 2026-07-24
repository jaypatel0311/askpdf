import { embedTexts, streamAnswer, EMBEDDING_DIMS } from '../lib/gemini';

const [vec] = await embedTexts(['hello world']);
console.log(`embedding dims: ${vec.length} (expect ${EMBEDDING_DIMS})`);
if (vec.length !== EMBEDDING_DIMS) process.exit(1);

process.stdout.write('stream: ');
for await (const t of streamAnswer('Say "smoke test ok" and nothing else.')) process.stdout.write(t);
console.log();
