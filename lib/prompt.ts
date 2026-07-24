export function buildPrompt(question: string, contexts: string[]): string {
  return `You answer questions about a document. Answer ONLY using the context excerpts below.
If the answer is not in the context, say "I don't know based on this document." Do not use outside knowledge.

Context:
${contexts.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}

Question: ${question}`;
}
