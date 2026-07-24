import Redis from 'ioredis';

export const QUEUE_KEY = 'askpdf:jobs';
const JOB_TTL_SECONDS = 60 * 60 * 24;

export interface IngestJob {
  jobId: string;
  documentId: string;
  fileId: string;
  filename: string;
}

export function makeRedis(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is not set');
  // maxRetriesPerRequest: null is required for long-blocking commands like BRPOP
  return new Redis(url, { maxRetriesPerRequest: null });
}

const globalForRedis = globalThis as unknown as { _redis?: Redis };
export function getRedis(): Redis {
  return (globalForRedis._redis ??= makeRedis());
}

const jobKey = (jobId: string) => `askpdf:job:${jobId}`;

export async function enqueueJob(redis: Redis, job: IngestJob): Promise<void> {
  await setJobStatus(redis, job.jobId, 'queued');
  await redis.lpush(QUEUE_KEY, JSON.stringify(job));
}

export async function popJob(redis: Redis, timeoutSec = 5): Promise<IngestJob | null> {
  const res = await redis.brpop(QUEUE_KEY, timeoutSec);
  return res ? (JSON.parse(res[1]) as IngestJob) : null;
}

export async function setJobStatus(
  redis: Redis,
  jobId: string,
  status: 'queued' | 'processing' | 'done' | 'failed',
  extra: Record<string, string> = {},
): Promise<void> {
  await redis.hset(jobKey(jobId), { status, ...extra });
  await redis.expire(jobKey(jobId), JOB_TTL_SECONDS);
}

export async function getJobStatus(redis: Redis, jobId: string) {
  const hash = await redis.hgetall(jobKey(jobId));
  return Object.keys(hash).length ? hash : null;
}
