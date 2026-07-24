import { ObjectId } from 'mongodb';
// pdf-parse's index.js runs a debug self-test when imported as an entry; import the lib directly
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { makeRedis, popJob, setJobStatus, type IngestJob } from '../lib/queue';
import { getCollections, loadPdf, deleteChunksFor } from '../lib/mongo';
import { splitIntoChunks } from '../lib/chunk';
import { embedTexts } from '../lib/gemini';
import { processJob, type JobDeps } from './process-job';

const redis = makeRedis();

function depsFor(job: IngestJob): JobDeps {
  return {
    setStatus: (status, extra) => setJobStatus(redis, job.jobId, status, extra),
    loadPdf,
    parsePdf: async (buffer) => {
      const parsed = await pdfParse(buffer);
      return { text: parsed.text, pageCount: parsed.numpages };
    },
    chunk: splitIntoChunks,
    embed: embedTexts,
    insertChunks: async (rows) => {
      const { chunks } = await getCollections();
      await chunks.insertMany(rows);
    },
    markDocument: async (documentId, fields) => {
      const { documents } = await getCollections();
      await documents.updateOne({ _id: new ObjectId(documentId) }, { $set: fields });
    },
    cleanup: deleteChunksFor,
  };
}

console.log('worker: waiting for jobs…');
for (;;) {
  const job = await popJob(redis, 5); // 5s timeout keeps the connection lively on Upstash
  if (!job) continue;
  console.log(`worker: processing ${job.jobId} (${job.filename})`);
  await processJob(job, depsFor(job));
  console.log(`worker: finished ${job.jobId}`);
}
