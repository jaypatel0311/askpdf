import { describe, it, expect } from 'vitest';
import { buildPrompt } from './prompt';

describe('buildPrompt', () => {
  const prompt = buildPrompt('What is X?', ['ctx one', 'ctx two']);
  it('contains the grounding instruction', () =>
    expect(prompt).toMatch(/ONLY.*context/i));
  it('numbers each context chunk', () => {
    expect(prompt).toContain('[1] ctx one');
    expect(prompt).toContain('[2] ctx two');
  });
  it('ends with the question', () =>
    expect(prompt.trimEnd().endsWith('Question: What is X?')).toBe(true));
});
