import { makeRedis, enqueueJob, popJob, getJobStatus } from '../lib/queue';

const redis = makeRedis();
const job = { jobId: 'smoke-1', documentId: 'd1', fileId: 'f1', filename: 'x.pdf' };
await enqueueJob(redis, job);
console.log('status after enqueue:', (await getJobStatus(redis, 'smoke-1'))?.status);
const popped = await popJob(redis, 1);
console.log('popped:', popped?.jobId === 'smoke-1' ? 'OK' : 'FAIL');
await redis.del('askpdf:job:smoke-1');
redis.disconnect();
