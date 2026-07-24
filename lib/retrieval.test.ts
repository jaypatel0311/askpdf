import { describe, it, expect } from 'vitest';
import { passesThreshold } from './retrieval';

const hit = (score: number) => ({ text: 't', chunkIndex: 0, score });

describe('passesThreshold', () => {
  it('rejects empty results', () => expect(passesThreshold([], 0.7)).toBe(false));
  it('rejects when top score is below the cutoff', () =>
    expect(passesThreshold([hit(0.69), hit(0.5)], 0.7)).toBe(false));
  it('accepts when top score meets the cutoff', () =>
    expect(passesThreshold([hit(0.7)], 0.7)).toBe(true));
});
