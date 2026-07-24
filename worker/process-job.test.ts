import { describe, it, expect, vi } from 'vitest';
import { processJob, type JobDeps } from './process-job';

const job = { jobId: 'j1', documentId: 'd1', fileId: 'f1', filename: 'x.pdf' };

function makeDeps(overrides: Partial<JobDeps> = {}): JobDeps {
  return {
    setStatus: vi.fn(async () => {}),
    loadPdf: vi.fn(async () => Buffer.from('pdf')),
    parsePdf: vi.fn(async () => ({ text: 'Some text.\n\nMore text.', pageCount: 2 })),
    chunk: vi.fn(() => ['Some text.', 'More text.']),
    embed: vi.fn(async (texts: string[]) => texts.map(() => [0.1, 0.2])),
    insertChunks: vi.fn(async () => {}),
    markDocument: vi.fn(async () => {}),
    cleanup: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('processJob', () => {
  it('happy path: stores chunks, marks document ready, sets done', async () => {
    const deps = makeDeps();
    await processJob(job, deps);
    expect(deps.insertChunks).toHaveBeenCalledWith([
      { documentId: 'd1', text: 'Some text.', embedding: [0.1, 0.2], chunkIndex: 0 },
      { documentId: 'd1', text: 'More text.', embedding: [0.1, 0.2], chunkIndex: 1 },
    ]);
    expect(deps.markDocument).toHaveBeenCalledWith('d1', { status: 'ready', pageCount: 2 });
    expect(deps.setStatus).toHaveBeenLastCalledWith('done');
    expect(deps.cleanup).not.toHaveBeenCalled();
  });

  it('failure mid-pipeline: cleans up chunks, marks failed, does not throw', async () => {
    const deps = makeDeps({ embed: vi.fn(async () => { throw new Error('quota'); }) });
    await expect(processJob(job, deps)).resolves.toBeUndefined();
    expect(deps.cleanup).toHaveBeenCalledWith('d1');
    expect(deps.markDocument).toHaveBeenCalledWith('d1', { status: 'failed' });
    expect(deps.setStatus).toHaveBeenLastCalledWith('failed', { error: 'quota' });
  });

  it('empty extracted text fails with a scanned-PDF hint', async () => {
    const deps = makeDeps({ parsePdf: vi.fn(async () => ({ text: '   ', pageCount: 1 })) });
    await processJob(job, deps);
    expect(deps.setStatus).toHaveBeenLastCalledWith('failed', {
      error: 'No extractable text — is this a scanned/image-only PDF?',
    });
    expect(deps.cleanup).toHaveBeenCalledWith('d1');
  });
});
