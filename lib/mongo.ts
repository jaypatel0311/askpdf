import { MongoClient, GridFSBucket, ObjectId, Db } from 'mongodb';

// Cache across Next.js dev hot-reloads so we don't leak connections
const globalForMongo = globalThis as unknown as { _mongoClient?: Promise<MongoClient> };

function getClient(): Promise<MongoClient> {
  if (!globalForMongo._mongoClient) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set');
    globalForMongo._mongoClient = new MongoClient(uri).connect();
  }
  return globalForMongo._mongoClient;
}

export async function getDb(): Promise<Db> {
  return (await getClient()).db('askpdf');
}

export async function getCollections() {
  const db = await getDb();
  return { documents: db.collection('documents'), chunks: db.collection('chunks') };
}

async function pdfBucket(): Promise<GridFSBucket> {
  return new GridFSBucket(await getDb(), { bucketName: 'pdfs' });
}

export async function savePdf(buffer: Buffer, filename: string): Promise<string> {
  const bucket = await pdfBucket();
  return new Promise((resolve, reject) => {
    const upload = bucket.openUploadStream(filename);
    upload.on('error', reject);
    upload.on('finish', () => resolve(upload.id.toString()));
    upload.end(buffer);
  });
}

export async function loadPdf(fileId: string): Promise<Buffer> {
  const bucket = await pdfBucket();
  const parts: Buffer[] = [];
  for await (const part of bucket.openDownloadStream(new ObjectId(fileId))) parts.push(part);
  return Buffer.concat(parts);
}

export async function deletePdf(fileId: string): Promise<void> {
  await (await pdfBucket()).delete(new ObjectId(fileId));
}

export async function deleteChunksFor(documentId: string): Promise<void> {
  const { chunks } = await getCollections();
  await chunks.deleteMany({ documentId });
}
