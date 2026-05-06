'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { chatWithSageAdmin } from '@/lib/api';

type Role = 'admin' | 'advisor';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const ADVISOR_CHIPS = [
  'Which students have missing holds?',
  'Show pending approvals',
  "Summarize A2111926's academic standing",
];

const ADMIN_CHIPS = [
  'List students with failing grades',
  'Which majors are understaffed?',
  'Show overdue payments',
];

interface SageAIDrawerProps {
  open: boolean;
  onClose: () => void;
  role: Role;
}

export default function SageAIDrawer({ open, onClose, role }: SageAIDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setInput('');
      setError(null);
    }
  }, [open]);

  const chips = role === 'advisor' ? ADVISOR_CHIPS : ADMIN_CHIPS;

  const handleSend = async (content?: string) => {
    const message = (content ?? input).trim();
    if (!message || loading) return;
    if (role === 'advisor' && !studentId.trim()) {
      setError('Student ID is required for advisor queries.');
      return;
    }

    setError(null);
    const nextMessages = [...messages, { role: 'user' as const, content: message }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithSageAdmin({
        message,
        history: messages,
        studentId: studentId.trim() || undefined,
      });
      setMessages([...nextMessages, { role: 'assistant' as const, content: response.reply }]);
    } catch (e: any) {
      setError(e?.message || 'Sage AI request failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-md bg-slate-950 text-slate-100 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles size={18} /> Sage AI
          </div>
          <button onClick={onClose} className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 pt-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Role</div>
          <div className="mt-1 text-sm text-slate-200">{role}</div>

          {role === 'advisor' && (
            <div className="mt-4">
              <label className="text-xs uppercase tracking-wide text-slate-400">Student ID</label>
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                placeholder="A2111926"
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex h-[calc(100%-260px)] flex-col gap-3 overflow-y-auto px-4 pb-4">
          {messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-800 p-4 text-sm text-slate-400">
              Ask Sage AI about enrollments, grades, or student status.
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={`${msg.role}-${idx}`}
              className={`rounded-xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'self-end bg-blue-600/20 text-blue-100'
                  : 'self-start bg-slate-800 text-slate-100'
              }`}
            >
              {msg.content}
            </div>
          ))}
          {loading && <div className="text-xs text-slate-400">Thinking...</div>}
          {error && <div className="text-xs text-rose-300">{error}</div>}
        </div>

        <div className="border-t border-slate-800 p-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              placeholder="Ask Sage about a student, section, or major"
            />
            <button
              onClick={() => handleSend()}
              className="rounded-lg bg-electric px-3 py-2 text-sm font-medium text-white"
              disabled={loading}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
