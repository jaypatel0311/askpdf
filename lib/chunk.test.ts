import { describe, it, expect } from 'vitest';
import { splitIntoChunks } from './chunk';

const para = (n: number, len = 400) =>
  `Paragraph ${n}. ` + 'word '.repeat(Math.ceil(len / 5)).trim();

describe('splitIntoChunks', () => {
  it('returns [] for empty/whitespace text', () => {
    expect(splitIntoChunks('')).toEqual([]);
    expect(splitIntoChunks('  \n\n  ')).toEqual([]);
  });

  it('returns one chunk for short text', () => {
    expect(splitIntoChunks('Hello world.')).toEqual(['Hello world.']);
  });

  it('splits long text into chunks within the size budget', () => {
    const text = Array.from({ length: 30 }, (_, i) => para(i)).join('\n\n');
    const chunks = splitIntoChunks(text, { chunkTokens: 200, overlapTokens: 30 });
    expect(chunks.length).toBeGreaterThan(1);
    // budget = chunkTokens*4 chars, allow overlap tail + one joined paragraph of slack
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(200 * 4 + 30 * 4 + 450);
  });

  it('consecutive chunks overlap (tail of A appears in B)', () => {
    const text = Array.from({ length: 30 }, (_, i) => para(i)).join('\n\n');
    const chunks = splitIntoChunks(text, { chunkTokens: 200, overlapTokens: 30 });
    const tail = chunks[0].slice(-40);
    expect(chunks[1]).toContain(tail.trim().slice(0, 20));
  });

  it('hard-splits a single paragraph larger than the budget', () => {
    const huge = 'sentence one is here. '.repeat(400);
    const chunks = splitIntoChunks(huge, { chunkTokens: 150, overlapTokens: 20 });
    expect(chunks.length).toBeGreaterThan(1);
  });
});
