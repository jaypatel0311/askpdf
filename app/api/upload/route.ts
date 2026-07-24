import { getCollections, savePdf } from '@/lib/mongo';
import { getRedis, enqueueJob } from '@/lib/queue';

const MAX_PDF_BYTES = 20 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File) || file.type !== 'application/pdf') {
    return Response.json({ error: 'Upload a PDF file' }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return Response.json({ error: 'PDF larger than 20 MB' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { documents } = await getCollections();
  const inserted = await documents.insertOne({
    filename: file.name,
    status: 'processing',
    uploadedAt: new Date(),
  });
  const documentId = inserted.insertedId.toString();
  const fileId = await savePdf(buffer, file.name);

  const jobId = crypto.randomUUID();
  await enqueueJob(getRedis(), { jobId, documentId, fileId, filename: file.name });

  // 202: accepted for processing — the worker does the heavy lifting
  return Response.json({ jobId, documentId }, { status: 202 });
}
