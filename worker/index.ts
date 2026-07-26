import { ObjectId } from 'mongodb';
import { PDFParse } from 'pdf-parse';
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
      const parser = new PDFParse({ data: buffer });
      try {
        const parsed = await parser.getText();
        return { text: parsed.text, pageCount: parsed.total };
      } finally {
        await parser.destroy();
      }
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
