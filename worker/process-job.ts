import type { IngestJob } from '../lib/queue';

export interface JobDeps {
  setStatus(status: 'processing' | 'done' | 'failed', extra?: Record<string, string>): Promise<void>;
  loadPdf(fileId: string): Promise<Buffer>;
  parsePdf(buffer: Buffer): Promise<{ text: string; pageCount: number }>;
  chunk(text: string): string[];
  embed(texts: string[]): Promise<number[][]>;
  insertChunks(rows: { documentId: string; text: string; embedding: number[]; chunkIndex: number }[]): Promise<void>;
  markDocument(documentId: string, fields: Record<string, unknown>): Promise<void>;
  cleanup(documentId: string): Promise<void>;
}

export async function processJob(job: IngestJob, deps: JobDeps): Promise<void> {
  try {
    await deps.setStatus('processing');
    const buffer = await deps.loadPdf(job.fileId);
    const { text, pageCount } = await deps.parsePdf(buffer);
    if (!text.trim()) {
      throw new Error('No extractable text — is this a scanned/image-only PDF?');
    }
    const chunks = deps.chunk(text);
    await deps.setStatus('processing', { progress: `embedding ${chunks.length} chunks` });
    const vectors = await deps.embed(chunks);
    await deps.insertChunks(
      chunks.map((chunkText, i) => ({
        documentId: job.documentId,
        text: chunkText,
        embedding: vectors[i],
        chunkIndex: i,
      })),
    );
    await deps.markDocument(job.documentId, { status: 'ready', pageCount });
    await deps.setStatus('done');
  } catch (err) {
    // Failure cleanup: no orphaned half-written chunks
    const message = err instanceof Error ? err.message : String(err);
    await deps.cleanup(job.documentId);
    await deps.markDocument(job.documentId, { status: 'failed' });
    await deps.setStatus('failed', { error: message });
  }
}
