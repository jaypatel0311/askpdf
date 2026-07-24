'use client';

import { useRef, useState } from 'react';

type Phase = 'idle' | 'uploading' | 'processing' | 'ready' | 'failed';
interface Message { role: 'user' | 'assistant'; text: string }

export default function AskPdf() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [filename, setFilename] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [streaming, setStreaming] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleUpload(file: File) {
    setPhase('uploading');
    setError('');
    setFilename(file.name);
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body });
    if (res.status !== 202) {
      setPhase('failed');
      setError((await res.json()).error ?? 'Upload failed');
      return;
    }
    const { jobId, documentId: docId } = await res.json();
    setDocumentId(docId);
    setPhase('processing');
    pollRef.current = setInterval(async () => {
      const status = await (await fetch(`/api/jobs/${jobId}`)).json();
      if (status.status === 'done' || status.status === 'failed') {
        clearInterval(pollRef.current!);
        setPhase(status.status === 'done' ? 'ready' : 'failed');
        if (status.error) setError(status.error);
      }
    }, 2000);
  }

  async function handleAsk() {
    const q = question.trim();
    if (!q || streaming) return;
    setQuestion('');
    setMessages((m) => [...m, { role: 'user', text: q }, { role: 'assistant', text: '' }]);
    setStreaming(true);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, documentId }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop()!; // keep any incomplete trailing event
        for (const event of events) {
          if (!event.startsWith('data: ')) continue;
          const data = JSON.parse(event.slice(6));
          if (data.token) {
            setMessages((m) => {
              const last = m[m.length - 1];
              return [...m.slice(0, -1), { ...last, text: last.text + data.token }];
            });
          }
          if (data.error) setError(data.error);
        }
      }
    } finally {
      setStreaming(false);
    }
  }

  return (
    <main className="askpdf">
      <h1>AskPDF</h1>
      <p className="tagline">Upload a PDF, then ask it questions. Answers come only from the document.</p>

      {phase !== 'ready' && (
        <label className="dropzone">
          <input
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
          {phase === 'idle' && 'Click to choose a PDF'}
          {phase === 'uploading' && 'Uploading…'}
          {phase === 'processing' && `Processing ${filename}…`}
          {phase === 'failed' && `Failed: ${error} — click to retry`}
        </label>
      )}

      {phase === 'ready' && (
        <>
          <p className="docname">Chatting with <strong>{filename}</strong></p>
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>{m.text || '…'}</div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleAsk(); }} className="composer">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something about the document…"
              disabled={streaming}
            />
            <button disabled={streaming || !question.trim()}>Ask</button>
          </form>
          {error && <p className="error">{error}</p>}
        </>
      )}
    </main>
  );
}
