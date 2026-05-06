'use client';

import { useState, useEffect, useRef } from 'react';
import { getSharedReport, chatWithSage, approveReport } from '@/lib/api';

// ── helpers ───────────────────────────────────────────────────────────────────

const ARCHETYPE_COLORS: Record<string, string> = {
  'Square Peg':        '#f59e0b',
  'Fading Student':    '#ef4444',
  'Overcommitter':     '#8b5cf6',
  'Selective Student': '#3b82f6',
  'Underdeliverer':    '#6b7280',
};

function ScoreBar({ name, score, originalScore, isUniversal }: { name: string; score: number; originalScore: number; isUniversal: boolean }) {
  const wasEdited = score !== originalScore;
  const color = score >= 75 ? 'var(--am)' : score >= 55 ? '#3b82f6' : '#ef4444';
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
        <span style={{ fontSize: '12px', color: 'var(--t2)' }}>
          {name}
          {!isUniversal && <span style={{ marginLeft: '5px', fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.05em' }}>FIELD</span>}
          {wasEdited && (
            <span style={{ marginLeft: '6px', fontSize: '9px', color: 'var(--am)' }}>
              edited by advisor
            </span>
          )}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {wasEdited && <span style={{ fontSize: '10px', color: 'var(--t5)', textDecoration: 'line-through' }}>{originalScore}</span>}
          <span style={{ fontSize: '12px', fontWeight: 600, color }}>{score}</span>
        </div>
      </div>
      <div style={{ height: '4px', background: 'var(--ob-3)', borderRadius: '2px' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: '2px' }} />
      </div>
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export default function AcademicDnaReportPage() {
  const [report, setReport]       = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [limitReached, setLimitReached] = useState(false);

  const [approving, setApproving] = useState(false);
  const [approved, setApproved]   = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSharedReport()
      .then(data => {
        setReport(data);
        if (data.isApproved) setApproved(true);
        setMessagesUsed(data.chatMessageCount ?? 0);
        setLimitReached((data.chatMessageCount ?? 0) >= 5);
        // Hydrate chat history
        const history: any[] = data.chatMessages ?? [];
        setChatMessages(history.map((m: any) => ({
          role: m.role === 'sage' ? 'sage' : 'student',
          content: m.content,
        })));
      })
      .catch((e: any) => {
        if (e.message?.includes('No shared report') || e.message?.includes('not found')) {
          setNotFound(true);
        } else {
          setFetchError(e.message ?? 'Failed to load report');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function handleChat() {
    const msg = chatInput.trim();
    if (!msg || chatLoading || limitReached || approved) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'student', content: msg }]);
    setChatLoading(true);
    try {
      const res = await chatWithSage(report.id, msg);
      setChatMessages(prev => [...prev, { role: 'sage', content: res.reply }]);
      setMessagesUsed(res.messagesUsed);
      setLimitReached(res.limitReached);
      // Update grade if SAGE adjusted one
      if (res.updatedGrade && report) {
        setReport((prev: any) => ({
          ...prev,
          finalGrades: (prev.finalGrades ?? []).map((g: any) =>
            g.name === res.updatedGrade!.skillName ? { ...g, score: res.updatedGrade!.newScore } : g
          ),
        }));
      }
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: 'sage', content: `Error: ${e.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleApprove() {
    if (!report || approved || approving) return;
    if (!confirm('Approve this report? This is final and cannot be undone.')) return;
    setApproving(true);
    try {
      await approveReport(report.id);
      setApproved(true);
    } catch (e: any) {
      alert(e.message ?? 'Approval failed');
    } finally {
      setApproving(false);
    }
  }

  if (loading) return (
    <div className="sage-page-header">
      <div className="sage-page-title">Academic DNA Report</div>
    </div>
  );

  if (fetchError) return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Academic DNA Report</div>
      </div>
      <div className="sage-body">
        <div className="sage-card">
          <div className="empty-state" style={{ padding: '48px 32px' }}>
            <div className="empty-msg" style={{ color: '#ef4444' }}>Could not load report</div>
            <div className="empty-sub">{fetchError}</div>
          </div>
        </div>
      </div>
    </>
  );

  if (notFound) return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Academic DNA Report</div>
        <div className="sage-page-sub">Your personalized academic profile.</div>
      </div>
      <div className="sage-body">
        <div className="sage-card">
          <div className="empty-state" style={{ padding: '48px 32px' }}>
            <div className="empty-msg">No report yet</div>
            <div className="empty-sub">Your advisor hasn't shared an Academic DNA report with you.</div>
          </div>
        </div>
      </div>
    </>
  );

  const dnaResult = report?.dnaResult ?? {};
  const archetype = dnaResult.archetype ?? '—';
  const archetypeColor = ARCHETYPE_COLORS[archetype] ?? 'var(--t4)';
  const finalGrades: any[] = report?.finalGrades ?? [];
  const originalGrades: any[] = report?.originalGrades ?? [];
  const advisorEdits: any[] = report?.advisorEditedGrades ?? [];

  const universal = finalGrades.filter(g => g.isUniversal ?? g.is_universal);
  const fieldSpecific = finalGrades.filter(g => !(g.isUniversal ?? g.is_universal));

  function getOriginalScore(name: string): number {
    return originalGrades.find(g => g.name === name)?.score ?? (finalGrades.find(g => g.name === name)?.score ?? 0);
  }

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Academic DNA Report</div>
        <div className="sage-page-sub">Your personalized academic profile — reviewed by your advisor.</div>
      </div>

      <div className="sage-body" style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Advisor note */}
        {report?.advisorNote && (
          <div style={{
            padding: '12px 16px',
            borderLeft: '3px solid var(--am)',
            background: 'rgba(245,158,11,0.05)',
            borderRadius: '0 6px 6px 0',
            fontSize: '13px',
            color: 'var(--t2)',
            lineHeight: 1.6,
          }}>
            <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--am)', letterSpacing: '0.06em', marginBottom: '4px', textTransform: 'uppercase' }}>
              Note from your advisor
            </div>
            {report.advisorNote}
          </div>
        )}

        {/* Archetype card */}
        <div className="sage-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ padding: '5px 12px', borderRadius: '6px', background: archetypeColor + '20', color: archetypeColor, fontSize: '13px', fontWeight: 700 }}>
              {archetype}
            </div>
            <div style={{ flex: 1, height: '4px', background: 'var(--ob-3)', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: `${(dnaResult.confidence ?? 0) * 100}%`, background: archetypeColor, borderRadius: '2px' }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: archetypeColor }}>
              {((dnaResult.confidence ?? 0) * 100).toFixed(0)}% confidence
            </span>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--t5)', marginBottom: '4px' }}>What this means</div>
            <p style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6, margin: 0 }}>{dnaResult.reasoning}</p>
          </div>

          <div>
            <div style={{ fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--t5)', marginBottom: '4px' }}>Predicted outcome</div>
            <p style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6, margin: 0 }}>{dnaResult.predictedOutcome ?? dnaResult.predicted_outcome}</p>
          </div>
        </div>

        {/* Skill grades */}
        {finalGrades.length > 0 && (
          <div className="sage-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
              Skill Assessment
            </div>

            {advisorEdits.length > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--am)', marginBottom: '12px', padding: '6px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: '4px' }}>
                Your advisor adjusted {advisorEdits.length} score{advisorEdits.length !== 1 ? 's' : ''} before sharing this report.
              </div>
            )}

            {universal.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.06em', marginBottom: '8px', textTransform: 'uppercase' }}>Universal Skills</div>
                {universal.map((g: any) => (
                  <ScoreBar key={g.name} name={g.name} score={g.score} originalScore={getOriginalScore(g.name)} isUniversal={true} />
                ))}
              </div>
            )}

            {fieldSpecific.length > 0 && (
              <div>
                <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.06em', marginBottom: '8px', textTransform: 'uppercase' }}>Field-Specific Skills</div>
                {fieldSpecific.map((g: any) => (
                  <ScoreBar key={g.name} name={g.name} score={g.score} originalScore={getOriginalScore(g.name)} isUniversal={false} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SAGE chat */}
        <div className="sage-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Discuss with SAGE
            </div>
            <div style={{ fontSize: '10px', color: limitReached ? '#ef4444' : 'var(--t5)' }}>
              {messagesUsed} / 5 messages used
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: 'var(--t4)', marginBottom: '12px', lineHeight: 1.5 }}>
            If you disagree with a grade, make a specific case with evidence from your record. SAGE can adjust individual scores by up to ±10 points, once per skill.
          </div>

          {/* Chat history */}
          {chatMessages.length > 0 && (
            <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'student' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '8px 12px', borderRadius: '8px', fontSize: '12.5px', lineHeight: 1.5,
                    background: m.role === 'student' ? 'var(--am)' : 'var(--ob-2)',
                    color: m.role === 'student' ? '#000' : '#f0f0f0',
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input */}
          {!approved && !limitReached && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="sage-input"
                placeholder="Challenge a grade with evidence…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChat()}
                disabled={chatLoading}
                style={{ flex: 1, fontSize: '12px' }}
              />
              <button className="btn btn-amber btn-sm" onClick={handleChat} disabled={chatLoading || !chatInput.trim()}>
                {chatLoading ? '…' : 'Send'}
              </button>
            </div>
          )}

          {limitReached && !approved && (
            <div style={{ fontSize: '11px', color: 'var(--t5)', textAlign: 'center', padding: '6px 0' }}>
              Message limit reached. Approve your report to finalise your grades.
            </div>
          )}

          {approved && (
            <div style={{ fontSize: '11px', color: 'var(--am)', textAlign: 'center', padding: '6px 0' }}>
              Report approved — grades are final.
            </div>
          )}
        </div>

        {/* Approve button */}
        {!approved && (
          <div className="sage-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '12px', color: 'var(--t4)', marginBottom: '14px', lineHeight: 1.6 }}>
              By approving, you confirm you have reviewed your Academic DNA report and skill grades. Once approved, grades are locked and your advisor is notified.
            </div>
            <button
              className="btn btn-amber"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? 'Approving…' : 'Approve Report'}
            </button>
          </div>
        )}

        {approved && (
          <div style={{
            padding: '12px 16px', borderRadius: '6px', background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)', fontSize: '12px', color: 'var(--am)', textAlign: 'center',
          }}>
            Report approved on {report.approvedAt ? new Date(report.approvedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}.
          </div>
        )}

      </div>
    </>
  );
}
