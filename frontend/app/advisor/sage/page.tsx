'use client';

import { useRef, useState, useEffect } from 'react';
import { chatWithSageAdmin } from '@/lib/api';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const ADVISOR_CHIPS = [
  'Which students have missing holds?',
  'Show pending approvals',
  "Summarize A2111926's academic standing",
];

export default function AdvisorSagePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (content?: string) => {
    const message = (content ?? input).trim();
    if (!message || loading) return;
    if (!studentId.trim()) {
      setError('Student ID is required for advisor queries.');
      return;
    }

    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: message }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithSageAdmin({
        message,
        history: messages,
        studentId: studentId.trim(),
      });
      setMessages([...nextMessages, { role: 'assistant', content: response.reply }]);
    } catch (e: any) {
      setError(e?.message || 'Sage AI request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Dark chat header */}
      <div style={{
        background: 'var(--ob)',
        padding: '16px 32px',
        borderBottom: '1px solid var(--ob-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(ellipse, rgba(245,158,11,.1), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.4px', color: '#fafafa' }}>
            Sage AI
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ob-5)', marginTop: '1px' }}>
            Ask questions about students, sections, and enrollments
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="dot pulse" style={{ background: '#4ade80', width: '5px', height: '5px' }} />
            <span style={{ fontSize: '10.5px', color: 'var(--ob-5)', fontWeight: 500 }}>Live</span>
          </div>
          <div style={{ width: '1px', height: '16px', background: 'var(--ob-3)' }} />
          <div>
            <label style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ob-4)', display: 'block', marginBottom: '3px' }}>
              Student ID
            </label>
            <input
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="sage-input-dark"
              style={{ width: '120px', padding: '5px 8px', fontSize: '12px' }}
              placeholder="A2111926"
            />
          </div>
        </div>
      </div>

      {/* Quick chips */}
      <div style={{ padding: '12px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surf)', display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
        {ADVISOR_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => handleSend(chip)}
            disabled={loading}
            style={{
              padding: '5px 12px',
              borderRadius: '3px',
              border: '1px solid var(--border)',
              background: 'transparent',
              fontSize: '12px',
              color: 'var(--t2)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.08s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f7f7f8')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: 'var(--bg)',
      }}>
        {messages.length === 0 && (
          <div className="empty-state" style={{ paddingTop: '48px', justifyContent: 'center' }}>
            <div className="empty-rule" />
            <div>
              <p className="empty-msg">Start the conversation.</p>
              <p className="empty-sub">Enter a Student ID above, then ask Sage a question.</p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={`${msg.role}-${idx}`}
            style={{
              maxWidth: '72%',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '4px 4px 1px 4px' : '4px 4px 4px 1px',
              background: msg.role === 'user' ? 'var(--am)' : 'var(--surf)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              color: msg.role === 'user' ? 'var(--ob)' : 'var(--t1)',
              fontSize: '13px',
              lineHeight: 1.55,
              fontWeight: msg.role === 'user' ? 600 : 400,
            }}
          >
            {msg.content}
          </div>
        ))}

        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '10px 14px',
            borderRadius: '4px 4px 4px 1px',
            background: 'var(--surf)',
            border: '1px solid var(--border)',
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
          }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: '5px', height: '5px',
                borderRadius: '50%',
                background: 'var(--t4)',
                animation: `pulse 1.2s ease ${i * 0.2}s infinite`,
                display: 'inline-block',
              }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{
            alignSelf: 'center',
            padding: '8px 14px',
            borderRadius: '3px',
            background: 'rgba(185,28,28,.08)',
            border: '1px solid rgba(185,28,28,.2)',
            fontSize: '12.5px',
            color: 'var(--red)',
          }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: '16px 32px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surf)',
        display: 'flex',
        gap: '10px',
        flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          className="sage-input"
          style={{ flex: 1 }}
          placeholder="Ask Sage about a student, section, or enrollment…"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="btn btn-amber"
          style={{ flexShrink: 0 }}
        >
          {loading ? 'Sending…' : 'Send →'}
        </button>
      </div>
    </div>
  );
}
