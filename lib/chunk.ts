const CHARS_PER_TOKEN = 4;

export interface ChunkOptions {
  chunkTokens?: number;   // target chunk size in tokens (~4 chars each)
  overlapTokens?: number; // tail of each chunk repeated at the start of the next
}

export function splitIntoChunks(
  text: string,
  { chunkTokens = 600, overlapTokens = 90 }: ChunkOptions = {},
): string[] {
  const maxChars = chunkTokens * CHARS_PER_TOKEN;
  const overlapChars = overlapTokens * CHARS_PER_TOKEN;

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return [];

  // Paragraphs bigger than the budget get pre-split (by sentence, then hard slice)
  const pieces = paragraphs.flatMap((p) =>
    p.length > maxChars ? splitOversized(p, maxChars) : [p],
  );

  const chunks: string[] = [];
  let current = '';
  for (const piece of pieces) {
    if (current && current.length + piece.length + 2 > maxChars) {
      chunks.push(current);
      current = current.slice(-overlapChars); // overlap: carry the tail forward
    }
    current = current ? `${current}\n\n${piece}` : piece;
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitOversized(paragraph: string, maxChars: number): string[] {
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let current = '';
  for (const s of sentences) {
    if (s.length > maxChars) {
      if (current) { out.push(current); current = ''; }
      for (let i = 0; i < s.length; i += maxChars) out.push(s.slice(i, i + maxChars));
    } else if (current && current.length + s.length + 1 > maxChars) {
      out.push(current);
      current = s;
    } else {
      current = current ? `${current} ${s}` : s;
    }
  }
  if (current) out.push(current);
  return out;
}
