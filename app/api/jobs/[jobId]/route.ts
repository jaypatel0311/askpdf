import { getRedis, getJobStatus } from '@/lib/queue';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const status = await getJobStatus(getRedis(), jobId);
  if (!status) return Response.json({ error: 'Unknown job' }, { status: 404 });
  return Response.json(status);
}
