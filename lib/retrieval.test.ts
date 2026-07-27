import { describe, it, expect } from 'vitest';
import { passesThreshold, isSummaryQuestion } from './retrieval';

const hit = (score: number) => ({ text: 't', chunkIndex: 0, score });

describe('passesThreshold', () => {
  it('rejects empty results', () => expect(passesThreshold([], 0.7)).toBe(false));
  it('rejects when top score is below the cutoff', () =>
    expect(passesThreshold([hit(0.69), hit(0.5)], 0.7)).toBe(false));
  it('accepts when top score meets the cutoff', () =>
    expect(passesThreshold([hit(0.7)], 0.7)).toBe(true));
});

describe('isSummaryQuestion', () => {
  it.each([
    'what is document about?',
    'What is this document about',
    'summarize this document',
    'Summarize it in short',
    'give me an overview',
    'tl;dr',
    'what are the main points?',
  ])('detects whole-document question: %s', (q) => expect(isSummaryQuestion(q)).toBe(true));

  it.each([
    'what programming languages does Jay know?',
    'what is the capital of France?',
    'when did he graduate?',
    'summarize the section about FSA validation',
  ])('leaves pointed question to vector search: %s', (q) =>
    expect(isSummaryQuestion(q)).toBe(false));
});
