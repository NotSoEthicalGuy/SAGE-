'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getStudent, analyzeStudent, updateAdvisorNotes, getAcademicDNA, chatAboutStudent,
  getStudentFlags, createStudentFlag, updateFlag, deleteFlag,
  getStudentGraduationPathway, generateGraduationPathway, generateAlternativePathway, getAdvisorMajors,
  getStudentInterventions, createStudentIntervention, getStudentPosNew,
} from '../../../../lib/api';
import type { StudentDetail, AIReport, DriftLevel, Enrollment } from '../../../../../shared/types';

// ─────────────────────────────────────────────
// Drift config
// ─────────────────────────────────────────────
const DRIFT_COLORS: Record<DriftLevel, string> = {
  on_track:      'var(--green-dot)',
  early_warning: 'var(--yellow-dot)',
  drifting:      'var(--orange-dot)',
  critical:      'var(--red-dot)',
};
const DRIFT_LABELS: Record<DriftLevel, string> = {
  on_track: 'On Track',
  early_warning: 'Early Warning',
  drifting: 'Drifting',
  critical: 'Critical',
};

// ─────────────────────────────────────────────
// AI Report Panel
// ─────────────────────────────────────────────
function AIReportPanel({ report, studentId, onNoteSaved }: { report: AIReport | null; studentId: string; onNoteSaved: () => void }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [notes, setNotes] = useState(report?.advisorNotes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setNotes(report?.advisorNotes || ''); }, [report]);

  async function runAnalysis() {
    setAnalyzing(true);
    setError('');
    try {
      await analyzeStudent(studentId);
      onNoteSaved(); // trigger reload
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveNotes() {
    if (!report) return;
    setSavingNotes(true);
    try {
      await updateAdvisorNotes(studentId, report.reportId, notes);
    } finally {
      setSavingNotes(false);
    }
  }

  if (!report) {
    return (
      <div className="ai-panel">
        <div className="sage-card-header">
          <span className="sage-card-title">AI Drift Analysis</span>
          <button className="btn btn-amber btn-sm" onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? <><div className="spinner" />Running...</> : 'Run Analysis'}
          </button>
        </div>
        <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
          {error ? <span style={{ color: '#dc2626' }}>{error}</span> : 'No analysis has been run for this student yet.'}
        </div>
      </div>
    );
  }

  const level = report.driftLevel;
  const signals = report.driftSignals as any[] || [];
  const strengths = report.strengths as any[] || [];
  const weaknesses = report.weaknesses as any[] || [];
  const rec = report.recommendation as any;

  return (
    <div className="ai-panel">
      <div className="sage-card-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span className="sage-card-title">AI Drift Analysis</span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
            {new Date(report.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <button className="btn btn-ghost-light btn-sm" onClick={runAnalysis} disabled={analyzing}>
          {analyzing ? <><div className="spinner-dark" />Re-running...</> : 'Re-run'}
        </button>
      </div>

      {/* Drift Score */}
      <div className="ai-section">
        <div className="ai-section-label">Drift Score</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${report.driftScore * 100}%`, background: DRIFT_COLORS[level], borderRadius: '3px', transition: 'width 0.5s ease' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '18px', color: DRIFT_COLORS[level], minWidth: '48px', textAlign: 'right' }}>
            {(report.driftScore * 100).toFixed(0)}%
          </span>
          <span className="dot-status">
            <span className="dot" style={{ background: DRIFT_COLORS[level] }} />{DRIFT_LABELS[level]}
          </span>
        </div>
        {report.trajectorySummary && (
          <p style={{ marginTop: '10px', fontSize: '13px', color: '#374151', lineHeight: '1.6', margin: '10px 0 0' }}>{report.trajectorySummary}</p>
        )}
      </div>

      {/* Drift Signals */}
      {signals.length > 0 && (
        <div className="ai-section">
          <div className="ai-section-label">Drift Signals</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {signals.map((s: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '3px', flexShrink: 0, marginTop: '1px',
                  background: s.severity === 'high' ? '#fef2f2' : s.severity === 'medium' ? '#fffbeb' : '#f0fdf4',
                  color: s.severity === 'high' ? '#b91c1c' : s.severity === 'medium' ? '#b45309' : '#15803d',
                }}>
                  {s.severity?.toUpperCase()}
                </span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>
                    {s.signalType?.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>{s.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Weaknesses */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="ai-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {strengths.length > 0 && (
            <div>
              <div className="ai-section-label" style={{ color: '#15803d', marginBottom: '6px' }}>Strengths</div>
              {strengths.map((s: any, i: number) => (
                <div key={i} style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>{s.domain}</div>
                  <div style={{ fontSize: '11.5px', color: '#6b7280' }}>{s.evidence}</div>
                </div>
              ))}
            </div>
          )}
          {weaknesses.length > 0 && (
            <div>
              <div className="ai-section-label" style={{ color: '#b91c1c', marginBottom: '6px' }}>Weaknesses</div>
              {weaknesses.map((w: any, i: number) => (
                <div key={i} style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>{w.domain}</div>
                  <div style={{ fontSize: '11.5px', color: '#6b7280' }}>{w.evidence}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reroute recommendations */}
      {rec?.isRerouteRecommended && rec.alternatives?.length > 0 && (
        <div className="ai-section">
          <div className="ai-section-label" style={{ color: '#1d4ed8' }}>Alternative Majors Recommended</div>
          {rec.alternatives.map((alt: any, i: number) => (
            <div key={i} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: i < rec.alternatives.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500, fontSize: '13px' }}>{alt.majorName}</span>
                <span className="badge badge-amber">{(alt.matchScore * 100).toFixed(0)}% match</span>
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{alt.reasoning}</div>
            </div>
          ))}
        </div>
      )}

      {/* Confidence */}
      <div className="ai-section" style={{ display: 'flex', gap: '16px', padding: '12px 16px' }}>
        <div>
          <div style={{ fontSize: '10.5px', color: '#9ca3af', marginBottom: '2px' }}>Confidence</div>
          <div style={{ fontWeight: 600, fontSize: '13px' }}>{(((report as any).confidence || 0) * 100).toFixed(0)}%</div>
        </div>
        {(report as any).dataGaps && ((report as any).dataGaps as string[]).length > 0 && (
          <div>
            <div style={{ fontSize: '10.5px', color: '#9ca3af', marginBottom: '2px' }}>Data Gaps</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{((report as any).dataGaps as string[]).join(', ')}</div>
          </div>
        )}
      </div>

      {/* Advisor Notes */}
      <div className="ai-section">
        <div className="ai-section-label">Advisor Notes</div>
        <textarea
          className="sage-input"
          style={{ height: '80px', resize: 'vertical', fontSize: '12.5px' }}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes about this analysis..."
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-ghost-light btn-sm" onClick={saveNotes} disabled={savingNotes}>
            {savingNotes ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', color: '#b91c1c', fontSize: '12px', background: '#fef2f2' }}>{error}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Academic DNA Panel
// ─────────────────────────────────────────────
function AcademicDNAPanel({ studentId }: { studentId: string }) {
  const [dna, setDna] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function runDNA() {
    setLoading(true);
    setError('');
    try {
      const result = await getAcademicDNA(studentId);
      setDna(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const ARCHETYPE_COLORS: Record<string, string> = {
    'Square Peg': '#f59e0b',
    'Fading Student': '#e88',
    'Overcommitter': '#f59e0b',
    'Selective Student': '#8e8',
    'Underdeliverer': '#888',
  };

  return (
    <div className="sage-card" style={{ marginTop: '12px' }}>
      <div className="sage-card-header">
        <span className="sage-card-title">Academic DNA</span>
        <button className="btn btn-ghost-light btn-sm" onClick={runDNA} disabled={loading}>
          {loading ? <><div className="spinner-dark" />Analyzing...</> : dna ? 'Re-run' : 'Run DNA Analysis'}
        </button>
      </div>

      {!dna && !loading && (
        <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
          {error ? <span style={{ color: '#dc2626' }}>{error}</span> : 'Click "Run DNA Analysis" to classify this student\'s academic archetype.'}
        </div>
      )}

      {dna && (
        <div style={{ padding: "16px 24px" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{
              padding: '4px 10px',
              borderRadius: '5px',
              background: (ARCHETYPE_COLORS[dna.archetype] || '#374151') + '18',
              color: ARCHETYPE_COLORS[dna.archetype] || '#374151',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '-0.1px',
            }}>
              {dna.archetype}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: `${dna.confidence * 100}%`, background: ARCHETYPE_COLORS[dna.archetype] || '#374151', borderRadius: '2px' }} />
              </div>
            </div>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: ARCHETYPE_COLORS[dna.archetype] || '#374151' }}>
              {(dna.confidence * 100).toFixed(0)}%
            </span>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: '4px' }}>Reasoning</div>
            <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6, margin: 0 }}>{dna.reasoning}</p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: '4px' }}>Predicted Outcome</div>
            <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6, margin: 0 }}>{dna.predicted_outcome}</p>
          </div>

          {dna.interventions?.length > 0 && (
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: '6px' }}>Recommended Interventions</div>
              <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                {dna.interventions.map((item: string, i: number) => (
                  <li key={i} style={{ fontSize: '12.5px', color: '#374151', marginBottom: '4px', lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Chat Panel
// ─────────────────────────────────────────────
function ChatPanel({ studentId }: { studentId: string }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function sendMessage() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const { reply } = await chatAboutStudent(studentId, msg, messages);
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sage-card" style={{ marginTop: '12px' }}>
      <div className="sage-card-header" style={{ cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="sage-card-title">AI Chat</span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Ask Claude about this student</span>
        </div>
        <span style={{ color: '#9ca3af', fontSize: '12px' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="chat-container">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div style={{ color: '#9ca3af', fontSize: '12.5px', textAlign: 'center', padding: '20px 0' }}>
                Ask anything about this student's academic profile, performance trends, or intervention strategies.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="chat-message assistant" style={{ color: '#9ca3af' }}>
                <div className="drift-bar-wrap" style={{ gap: '4px' }}>
                  <div className="spinner-dark" style={{ width: '10px', height: '10px', borderWidth: '1.5px' }} />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="chat-input-row">
            <input
              className="sage-input"
              style={{ flex: 1, fontSize: '13px' }}
              placeholder="Ask about this student..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            />
            <button className="btn btn-amber btn-sm" onClick={sendMessage} disabled={loading || !input.trim()}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Course History Table
// ─────────────────────────────────────────────
function CourseHistoryTable({ enrollments }: { enrollments: Enrollment[] }) {
  const bySemester = new Map<string, Enrollment[]>();
  for (const e of enrollments) {
    const key = `${e.year}-S${e.semester}`;
    if (!bySemester.has(key)) bySemester.set(key, []);
    bySemester.get(key)!.push(e);
  }

  const STATUS_COLORS: Record<string, string> = {
    completed: '#16a34a',
    in_progress: '#2563eb',
    withdrawn: '#d97706',
    failed: '#dc2626',
  };

  return (
    <div className="sage-card">
      <div className="sage-card-header">
        <span className="sage-card-title">Academic History</span>
      </div>
      {Array.from(bySemester.entries()).map(([semKey, semEnrollments]) => {
        const grades = semEnrollments.map(e => e.finalGrade).filter(Boolean) as number[];
        const avg = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null;
        return (
          <div key={semKey}>
            <div style={{ padding: '8px 16px', background: '#fafafa', borderBottom: '1px solid #f3f4f6', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{semKey}</span>
              {avg !== null && (
                <span style={{ fontSize: '11.5px', color: '#6b7280' }}>
                  Avg: <strong style={{ color: avg < 60 ? '#dc2626' : avg < 70 ? '#ea580c' : '#111827' }}>{avg.toFixed(1)}</strong>/100
                </span>
              )}
            </div>
            <table className="data-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Credits</th>
                  <th>Grade</th>
                  <th>Letter</th>
                  <th>Status</th>
                  <th>Exams</th>
                </tr>
              </thead>
              <tbody>
                {semEnrollments.map(e => (
                  <tr key={e.enrollmentId}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '12.5px' }}>{e.course.name}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>{e.course.code}</div>
                    </td>
                    <td style={{ color: '#6b7280' }}>{e.course.credits}</td>
                    <td>
                      {e.finalGrade !== null ? (
                        <span style={{ fontWeight: 600, color: e.finalGrade < 60 ? '#dc2626' : e.finalGrade < 70 ? '#ea580c' : '#111827' }}>
                          {e.finalGrade.toFixed(1)}
                        </span>
                      ) : <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td>
                      {e.letterGrade ? (
                        <span className={`badge ${e.letterGrade.startsWith('A') ? 'badge-green' : e.letterGrade.startsWith('B') ? 'badge-amber' : e.letterGrade === 'F' ? 'badge-red' : 'badge-amber'}`}>
                          {e.letterGrade}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <span style={{ fontSize: '11.5px', color: STATUS_COLORS[e.status] || '#6b7280' }}>
                        {e.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {e.exams.map((ex, i) => (
                          <span key={i} title={`${ex.examType}: ${ex.score}/${ex.maxScore}`} style={{ fontSize: '10.5px', color: '#9ca3af', background: '#f3f4f6', padding: '1px 5px', borderRadius: '3px' }}>
                            {ex.examType[0].toUpperCase()}: {ex.score}
                          </span>
                        ))}
                        {e.exams.length === 0 && <span style={{ color: '#d1d5db', fontSize: '11.5px' }}>—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      {enrollments.length === 0 && (
        <div className="empty-state">No enrollment history found</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Flags Panel
// ─────────────────────────────────────────────
const FLAG_TYPES = ['Academic Hold', 'At Risk', 'Follow Up Required', 'Prerequisite Violation', 'Positive Progress'] as const;

function FlagsPanel({ studentId }: { studentId: string }) {
  const [flags, setFlags] = useState<any[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ flagType: FLAG_TYPES[0], note: '', isVisibleToStudent: false });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await getStudentFlags(studentId);
      setFlags(Array.isArray(data) ? data : []);
    } catch {}
  }

  useEffect(() => { load(); }, [studentId]);

  const active = flags.filter(f => !f.resolvedAt);
  const resolved = flags.filter(f => f.resolvedAt);

  async function resolve(flagId: string) {
    try { await updateFlag(flagId, { resolvedAt: new Date().toISOString() }); } catch {} finally { load(); }
  }

  async function remove(flagId: string) {
    if (!window.confirm('Delete this flag?')) return;
    try { await deleteFlag(flagId); } catch {} finally { load(); }
  }

  async function save() {
    setSaving(true);
    try {
      await createStudentFlag(studentId, form);
      setShowModal(false);
      setForm({ flagType: FLAG_TYPES[0], note: '', isVisibleToStudent: false });
      load();
    } catch (e: any) {
      alert(e?.message || 'Failed to save flag');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ai-panel" style={{ marginTop: '12px' }}>
      <div className="sage-card-header">
        <span className="sage-card-title">Flags</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(true)}>Add Flag</button>
      </div>

      {active.length === 0 && resolved.length === 0 && (
        <div className="empty-state">
          <div className="empty-rule" />
          <div><p className="empty-msg">No flags.</p></div>
        </div>
      )}

      {active.map(f => (
        <div key={f.flagId} style={{ padding: '10px 16px', borderBottom: '1px solid var(--ob-2)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--t1)' }}>{f.flagType}</div>
              {f.note && <div style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '2px' }}>{f.note}</div>}
              {f.isVisibleToStudent && <div style={{ fontSize: '11px', color: 'var(--t4)', marginTop: '2px' }}>(visible to student)</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--t4)' }}>
                {new Date(f.createdAt).toLocaleDateString()}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }} onClick={() => resolve(f.flagId)}>Resolve</button>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px', color: 'var(--red)' }} onClick={() => remove(f.flagId)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {resolved.length > 0 && (
        <div style={{ padding: '8px 16px' }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px', color: 'var(--t4)' }}
            onClick={() => setShowResolved(v => !v)}>
            {showResolved ? 'Hide resolved' : `Show resolved (${resolved.length})`}
          </button>
          {showResolved && resolved.map(f => (
            <div key={f.flagId} style={{ padding: '8px 0', borderBottom: '1px solid var(--ob-2)' }}>
              <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--t4)', textDecoration: 'line-through' }}>{f.flagType}</div>
              <div style={{ fontSize: '11px', color: 'var(--t4)' }}>
                Resolved {new Date(f.resolvedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="sage-card" style={{ width: '380px', padding: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '16px', color: 'var(--t1)' }}>Add Flag</div>
            <div className="form-group">
              <label className="input-label">Flag Type</label>
              <select className="sage-select" value={form.flagType} onChange={e => setForm(f => ({ ...f, flagType: e.target.value as any }))}>
                {FLAG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">Note</label>
              <textarea className="sage-input" rows={3} placeholder="Required — describe the reason for this flag" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="vis" checked={form.isVisibleToStudent} onChange={e => setForm(f => ({ ...f, isVisibleToStudent: e.target.checked }))} />
              <label htmlFor="vis" className="input-label" style={{ marginBottom: 0 }}>Visible to student</label>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-amber btn-sm" disabled={saving || !form.note} onClick={save}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Pathway Tab
// ─────────────────────────────────────────────
function PathwayTab({ studentId, student }: { studentId: string; student: any }) {
  const [subTab, setSubTab] = useState<'current' | 'alternative'>('current');
  const [plan, setPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [majors, setMajors] = useState<any[]>([]);
  const [targetMajorId, setTargetMajorId] = useState('');
  const [altPlan, setAltPlan] = useState<any | null>(null);
  const [generatingAlt, setGeneratingAlt] = useState(false);
  const [altError, setAltError] = useState('');

  useEffect(() => {
    getStudentGraduationPathway(studentId)
      .then((data: any) => setPlan(data?.pathway ?? (data?.semesterPlans ?? null)))
      .catch(() => {})
      .finally(() => setLoading(false));
    getAdvisorMajors().then((data: any) => {
      setMajors(Array.isArray(data) ? data.filter((m: any) => m.majorId !== student.majorId) : []);
    }).catch(() => {});
  }, [studentId, student.majorId]);

  async function generate() {
    setGenerating(true);
    try {
      const data: any = await generateGraduationPathway(studentId);
      setPlan(data?.pathway ?? (data?.semesterPlans ?? null));
    } catch {} finally { setGenerating(false); }
  }

  async function generateAlt() {
    if (!targetMajorId) return;
    setGeneratingAlt(true);
    setAltError('');
    try {
      const data: any = await generateAlternativePathway(studentId, targetMajorId);
      setAltPlan(data);
    } catch (e: any) {
      setAltError(e?.message || 'Failed to generate alternative pathway');
    } finally { setGeneratingAlt(false); }
  }

  return (
    <div>
      {/* Sub-tab toggle: Current Major | Alternative Major */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        {(['current', 'alternative'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
            fontSize: '12.5px', fontWeight: 500,
            borderBottom: subTab === t ? '2px solid var(--am)' : '2px solid transparent',
            color: subTab === t ? 'var(--t1)' : 'var(--t4)',
          }}>
            {t === 'current' ? 'Current Major' : 'Alternative Major'}
          </button>
        ))}
      </div>

      {subTab === 'current' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            {generating ? (
              <span style={{ fontSize: '12px', color: 'var(--t4)' }}>Generating pathway…</span>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={generate}>
                {plan ? 'Regenerate Pathway' : 'Generate Pathway'}
              </button>
            )}
          </div>

          {loading && <div style={{ fontSize: '13px', color: 'var(--t4)' }}>Loading…</div>}

          {!loading && !plan && !generating && (
            <div className="empty-state">
              <div className="empty-rule" />
              <div><p className="empty-msg">No pathway generated yet.</p></div>
            </div>
          )}

          {plan && (
            <>
              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', padding: '12px', background: 'var(--ob-1)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--t4)' }}>Semesters Left</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--t1)' }}>
                    {plan.semestersRemaining}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--t4)' }}>Projected Graduation</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: plan.onTrack ? 'var(--green)' : 'var(--am)' }}>
                    {plan.projectedGraduationDate}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t3)', marginBottom: '6px' }}>Semester Plan</div>
              <table className="data-table" style={{ marginBottom: '16px' }}>
                <thead>
                  <tr><th>Semester</th><th>Year</th><th>Planned Courses</th></tr>
                </thead>
                <tbody>
                  {plan.semesterPlan?.map((s: any, i: number) => (
                    <tr key={i}>
                      <td>S{s.semesterNumber}</td>
                      <td>{s.year}</td>
                      <td style={{ fontSize: '12px' }}>{s.courseCodes?.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {plan.recoveryPlan?.length > 0 && (
                <>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--am)', marginBottom: '6px' }}>Recovery Plan</div>
                  <table className="data-table">
                    <thead>
                      <tr><th>Semester</th><th>Year</th><th>Makeup Courses</th></tr>
                    </thead>
                    <tbody>
                      {plan.recoveryPlan.map((s: any, i: number) => (
                        <tr key={i}>
                          <td>S{s.semesterNumber}</td>
                          <td>{s.year}</td>
                          <td style={{ fontSize: '12px' }}>{s.courseCodes?.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>
      )}

      {subTab === 'alternative' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <select className="sage-select" style={{ flex: 1 }} value={targetMajorId} onChange={e => { setTargetMajorId(e.target.value); setAltPlan(null); setAltError(''); }}>
              <option value="">Select alternative major…</option>
              {majors.map((m: any) => <option key={m.majorId} value={m.majorId}>{m.name}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" disabled={!targetMajorId || generatingAlt} onClick={generateAlt}>
              {generatingAlt ? 'Generating…' : 'Generate'}
            </button>
          </div>

          {altPlan && (
            <>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', padding: '12px', background: 'var(--ob-1)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--t4)' }}>Transferable Credits</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--t1)' }}>{altPlan.transferableCredits}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--t4)' }}>New Courses Required</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--t1)' }}>{altPlan.newCoursesRequired?.length ?? 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--t4)' }}>Projected Graduation</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--am)' }}>{altPlan.projectedGraduationDate}</div>
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr><th>Semester</th><th>Year</th><th>Planned Courses</th></tr>
                </thead>
                <tbody>
                  {altPlan.semesterPlan?.map((s: any, i: number) => (
                    <tr key={i}>
                      <td>S{s.semesterNumber}</td>
                      <td>{s.year}</td>
                      <td style={{ fontSize: '12px' }}>{s.courseCodes?.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {altError && (
            <div style={{ fontSize: '12px', color: 'var(--red-dot)', marginBottom: '8px' }}>{altError}</div>
          )}

          {!altPlan && !generatingAlt && !altError && (
            <div className="empty-state">
              <div className="empty-rule" />
              <div><p className="empty-msg">Select a major and generate a comparison pathway.</p></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Interventions Panel
// ─────────────────────────────────────────────
function InterventionsPanel({ studentId }: { studentId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  async function load() {
    try {
      const data = await getStudentInterventions(studentId) as any;
      setItems(Array.isArray(data) ? data : []);
    } catch {}
  }

  useEffect(() => { load(); }, [studentId]);

  async function save() {
    if (!type.trim()) return;
    setSaving(true);
    try {
      await createStudentIntervention(studentId, {
        interventionType: type.trim(),
        notes: notes.trim() || undefined,
        interventionDate: new Date(date).toISOString(),
      });
      setShowModal(false);
      setType('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
    } catch (e: any) {
      alert(e?.message || 'Failed to save intervention');
    } finally {
      setSaving(false);
      load();
    }
  }

  return (
    <div className="ai-panel" style={{ marginTop: '12px' }}>
      <div className="sage-card-header">
        <span className="sage-card-title">Interventions</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(true)}>Log Intervention</button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-rule" />
          <div><p className="empty-msg">No interventions logged yet.</p></div>
        </div>
      ) : (
        <div style={{ marginTop: '12px' }}>
          {items.map((item: any) => {
            const outcome = item.outcome;
            let outcomeEl: React.ReactNode = null;
            if (outcome !== null && outcome !== undefined) {
              if (outcome.driftScoreAfter === null || outcome.driftScoreAfter === undefined) {
                outcomeEl = <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--t4)' }}>Awaiting next analysis</div>;
              } else if (outcome.effectivenessScore > 0) {
                outcomeEl = <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--green)' }}>+{outcome.effectivenessScore} improvement</div>;
              } else if (outcome.effectivenessScore < 0) {
                outcomeEl = <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--red-dot)' }}>{outcome.effectivenessScore} worsened</div>;
              } else {
                outcomeEl = <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--t3)' }}>No change</div>;
              }
            }
            return (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ob-2)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--t1)' }}>{item.interventionType}</div>
                  {item.notes && <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '2px' }}>{item.notes}</div>}
                  {outcomeEl}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--t4)', flexShrink: 0, marginLeft: '12px' }}>
                  {new Date(item.interventionDate).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50 }}
            onClick={() => setShowModal(false)}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'var(--ob-0)', border: '1px solid var(--ob-2)', borderRadius: '8px',
            padding: '24px', width: '380px', zIndex: 51,
          }}>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '16px', color: 'var(--t1)' }}>Log Intervention</div>

            <div className="form-group">
              <label className="input-label">Intervention Type</label>
              <input
                className="sage-input"
                value={type}
                onChange={e => setType(e.target.value)}
                placeholder="e.g. Academic Counseling"
              />
            </div>

            <div className="form-group">
              <label className="input-label">Notes (optional)</label>
              <textarea
                className="sage-textarea"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="input-label">Date</label>
              <input
                type="date"
                className="sage-input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-amber btn-sm" disabled={saving || !type.trim()} onClick={save}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// POS Tab
// ─────────────────────────────────────────────
function PosTab({ studentId }: { studentId: string }) {
  const [pos, setPos] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getStudentPosNew(studentId);
        setPos(data);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    load();
  }, [studentId]);

  function handlePrint() {
    document.body.classList.add('pos-print');
    window.print();
    setTimeout(() => document.body.classList.remove('pos-print'), 100);
  }

  if (loading) return <div className="loading-state">Loading program of study…</div>;
  if (!pos) return <div style={{ color: 'var(--t4)', fontSize: '13px' }}>No program of study configured for this major.</div>;

  const { totalCreditsPassed, totalCreditsRequired, groups } = pos;

  return (
    <div id="pos-content">
      <style>{`
        @media print {
          body.pos-print .sage-sidebar,
          body.pos-print .sage-page-header,
          body.pos-print .sage-main > *:not(#pos-root) { display: none !important; }
          body.pos-print #pos-content { display: block !important; }
        }
      `}</style>

      {/* Header bar: legend + print button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }} className="pos-no-print">
        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <LegendItem color="none" label="Not Registered" />
          <LegendItem color="rgba(156,163,175,0.35)" label="Registered" />
          <LegendItem color="rgba(134,197,134,0.35)" label="Completed" />
          <LegendItem color="rgba(239,150,150,0.35)" label="Failed" />
        </div>
        <button
          className="btn btn-ghost btn-sm pos-no-print"
          style={{ fontSize: '11px' }}
          onClick={handlePrint}
        >
          Print
        </button>
      </div>

      {/* Credits summary */}
      <div style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '12px' }}>
        Credits: <strong style={{ color: 'var(--t1)' }}>{totalCreditsPassed}</strong> / <strong style={{ color: 'var(--t1)' }}>{totalCreditsRequired}</strong>
      </div>

      {/* Groups */}
      {groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-rule" />
          <div><p className="empty-msg">No requirements configured for this major.</p></div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {groups.map((group: any) => (
            <div key={group.groupName} style={{ overflow: 'hidden', border: '1px solid var(--ob-2)', borderRadius: '6px' }}>
              {/* Group header */}
              <div style={{
                background: 'var(--ob-3)', padding: '8px 12px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--t1)' }}>{group.groupName}</span>
                <span style={{ fontSize: '12px', color: 'var(--t3)' }}>
                  Passed Credits / Out Of &nbsp;
                  <strong style={{ color: 'var(--t2)' }}>{group.groupCreditsPassed}/{group.groupCreditsRequired}</strong>
                </span>
              </div>

              {/* Table */}
              <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '7%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Crs.#</th>
                    <th>Course Title</th>
                    <th>Credits</th>
                    <th>Req. Type</th>
                    <th>Semester</th>
                    <th>Grade</th>
                    <th>Sign</th>
                  </tr>
                </thead>
                <tbody>
                  {group.courses.map((course: any) => {
                    const gradeCellBg =
                      course.status === 'completed' ? 'rgba(134,197,134,0.3)' :
                      course.status === 'registered' ? 'rgba(156,163,175,0.25)' :
                      course.status === 'failed'     ? 'rgba(239,150,150,0.3)' :
                      undefined;

                    return (
                      <tr key={course.requirementId}>
                        <td style={{ fontSize: '11.5px', fontFamily: 'monospace' }}>{course.code}</td>
                        <td style={{ fontSize: '12px' }}>{course.name}</td>
                        <td style={{ fontSize: '12px', textAlign: 'center' }}>{course.credits}</td>
                        <td style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'capitalize' }}>{course.requirementType}</td>
                        <td style={{ fontSize: '12px', color: 'var(--t3)' }}>{course.semester || '—'}</td>
                        <td style={{ fontSize: '12px', background: gradeCellBg, textAlign: 'center' }}>
                          {course.grade !== null ? course.grade : '—'}
                        </td>
                        <td style={{ fontSize: '12px', textAlign: 'center', fontWeight: 600, color: 'var(--t2)' }}>{course.sign}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--t3)' }}>
      <div style={{
        width: '12px', height: '12px', borderRadius: '2px', flexShrink: 0,
        background: color === 'none' ? 'transparent' : color,
        border: color === 'none' ? '1.5px solid var(--t4)' : 'none',
      }} />
      {label}
    </div>
  );
}

// ─────────────────────────────────────────────
// Left Column
// ─────────────────────────────────────────────
function LeftColumn({ student, studentId }: { student: any; studentId: string }) {
  const [activeTab, setActiveTab] = useState<'history' | 'pathway' | 'pos'>('history');

  return (
    <div>
      {student.prerequisiteViolations?.length > 0 && (
        <div style={{ borderLeft: '3px solid var(--am)', padding: '10px 14px', marginBottom: '12px', background: 'rgba(245,158,11,0.06)', borderRadius: '0 4px 4px 0' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--am)', marginBottom: '4px' }}>Prerequisite Violations</div>
          {student.prerequisiteViolations.map((v: any, i: number) => (
            <div key={i} style={{ fontSize: '12px', color: 'var(--t2)' }}>
              {v.courseName} — missing {v.missingPrerequisiteCode}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--ob-2)', marginBottom: '16px' }}>
        {(['history', 'pathway', 'pos'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0',
            fontSize: '13px', fontWeight: 500,
            borderBottom: activeTab === tab ? '2px solid var(--am)' : '2px solid transparent',
            color: activeTab === tab ? 'var(--t1)' : 'var(--t4)',
          }}>
            {tab === 'history' ? 'Course History' : tab === 'pathway' ? 'Pathway' : 'Program of Study'}
          </button>
        ))}
      </div>

      {activeTab === 'history' ? (
        <CourseHistoryTable enrollments={student.enrollments} />
      ) : activeTab === 'pathway' ? (
        <PathwayTab studentId={studentId} student={student} />
      ) : (
        <PosTab studentId={studentId} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Student Profile Page
// ─────────────────────────────────────────────
export default function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await getStudent(studentId);
      setStudent(data);
    } catch (e: any) {
      if (e.message.includes('not found') || e.message.includes('denied')) {
        router.push('/advisor/dashboard');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [studentId]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#9ca3af', fontSize: '13px' }}>
      Loading student profile...
    </div>
  );

  if (!student) return null;

  const latestReport = student.aiReports?.[0] || null;

  return (
    <>
      <div className="sage-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <button className="btn btn-ghost btn-sm" style={{ padding: '4px 0', color: '#6b7280' }} onClick={() => router.push('/advisor/dashboard')}>
            ← My Students
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div className="sage-page-title">{student.name}</div>
            <div className="sage-page-sub">
              {student.major?.name} · Semester {student.currentSemester} · GPA{' '}
              <strong style={{ color: student.cumulativeGpa && student.cumulativeGpa < 2 ? '#dc2626' : '#111827' }}>
                {student.cumulativeGpa?.toFixed(2) ?? '—'}
              </strong>
              {' '}· {student.email}
            </div>
          </div>
        </div>
      </div>

      <div className="sage-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', alignItems: 'start' }}>
          <LeftColumn student={student} studentId={studentId} />
          <div>
            <AIReportPanel
              report={latestReport as AIReport | null}
              studentId={studentId}
              onNoteSaved={load}
            />
            <FlagsPanel studentId={studentId} />
            <InterventionsPanel studentId={studentId} />
            <AcademicDNAPanel studentId={studentId} />
            <ChatPanel studentId={studentId} />
          </div>
        </div>
      </div>
    </>
  );
}
