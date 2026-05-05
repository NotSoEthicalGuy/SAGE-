'use client';

import { useState } from 'react';
import { SendHorizonal, Sparkles } from 'lucide-react';
import { chatAboutStudent } from '@/lib/api';

const chips = [
  'Do I have any holds?',
  'What are my grades this semester?',
  'When is my next class?',
  'How many credits do I need to graduate?',
  'Explain my account balance',
];

export default function SageDrawer({ open, onClose, studentId }: { open: boolean; onClose: () => void; studentId?: string }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hello. I am Sage AI. Ask me about your academics, holds, grades, or dues.' },
  ]);

  const submit = async (forcedText?: string) => {
    const text = (forcedText ?? input).trim();
    if (!text || loading || !studentId) return;

    const nextMessages = [...messages, { role: 'user' as const, content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const history = nextMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
      const response = await chatAboutStudent(studentId, text, history);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply || 'No response.' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sage is unavailable right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed right-0 top-0 z-50 h-full w-full max-w-xl transform bg-slate-950 text-slate-100 shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles size={18} className="text-electric" />
          Ask Sage AI
        </div>
        <button onClick={onClose} className="rounded-md bg-slate-800 px-3 py-1 text-sm">
          Close
        </button>
      </div>

      <div className="flex h-[calc(100%-78px)] flex-col">
        <div className="space-y-3 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => submit(chip)}
                className="rounded-full border border-electric/60 px-3 py-1 text-xs text-electric hover:bg-electric/10"
              >
                {chip}
              </button>
            ))}
          </div>

          {messages.map((m, idx) => (
            <div
              key={`${m.role}-${idx}`}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === 'assistant' ? 'bg-slate-800' : 'ml-auto bg-electric text-white'}`}
            >
              {m.content}
            </div>
          ))}

          {loading && <div className="rounded-xl bg-slate-800 px-4 py-2 text-sm">Sage is thinking...</div>}
        </div>

        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Ask a question"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm outline-none"
            />
            <button
              onClick={() => submit()}
              className="rounded-xl bg-electric p-2 text-white disabled:opacity-60"
              disabled={loading}
            >
              <SendHorizonal size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
