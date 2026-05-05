'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdvisorStudents, runAdvisorTriage, getLatestTriage } from '@/lib/api';

export default function AdvisorStudentsPage() {
  const router = useRouter();

  const [students, setStudents]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');

  const [triageResult, setTriageResult]   = useState<any>(null);
  const [triageRunAt, setTriageRunAt]     = useState<string | null>(null);
  const [triageRunning, setTriageRunning] = useState(false);
  const [inTriageMode, setInTriageMode]   = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdvisorStudents();
        setStudents(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }

      try {
        const triage = await getLatestTriage() as any;
        if (triage?.students) {
          setTriageResult(triage);
          setTriageRunAt(triage.runAt);
          setInTriageMode(true);
        }
      } catch {
        // no previous triage — that's fine
      }
    }
    load();
  }, []);

  async function runTriage() {
    setTriageRunning(true);
    try {
      const data = await runAdvisorTriage() as any;
      setTriageResult(data);
      setTriageRunAt(data.runAt ?? new Date().toISOString());
      setInTriageMode(true);
    } catch (e: any) {
      alert(e?.message || 'Triage failed');
    } finally {
      setTriageRunning(false);
    }
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.studentNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  const triageStudents: any[] = Array.isArray(triageResult?.students)
    ? [...triageResult.students].sort((a, b) => b.urgencyScore - a.urgencyScore)
    : [];

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">My Students</div>
        <div className="sage-page-sub">Students in your assigned major</div>
      </div>

      <div className="sage-body">
        {inTriageMode ? (
          <>
            {/* Triage header bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--t4)', padding: 0 }}
                onClick={() => setInTriageMode(false)}
              >
                ← Back to standard view
              </button>
              <span style={{ fontSize: '12px', color: 'var(--t3)' }}>
                Last triage: {triageRunAt ? new Date(triageRunAt).toLocaleDateString() : '—'} — {triageStudents.length} students analyzed
              </span>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--t4)', padding: 0 }}
                onClick={runTriage}
                disabled={triageRunning || loading}
              >
                Re-run
              </button>
            </div>

            {/* Triage table */}
            <div className="sage-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Urgency Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {triageStudents.map((s: any) => {
                    const borderColor =
                      s.urgencyLevel === 'immediate' ? 'var(--red-dot)' :
                      s.urgencyLevel === 'high'      ? 'var(--am)' :
                      s.urgencyLevel === 'monitor'   ? 'var(--t3)' : undefined;
                    return (
                      <tr
                        key={s.studentId}
                        style={{ cursor: 'pointer', borderLeft: borderColor ? `2px solid ${borderColor}` : undefined }}
                        onClick={() => router.push(`/advisor/students/${s.studentId}`)}
                      >
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--t1)' }}>{s.studentName}</div>
                          {s.topThreeReasons?.[0] && <div style={{ fontSize: '12px', color: 'var(--t4)', marginTop: '2px' }}>{s.topThreeReasons[0]}</div>}
                          {s.recommendedAction && <div style={{ fontSize: '12px', color: 'var(--t4)' }}>{s.recommendedAction}</div>}
                        </td>
                        <td style={{ fontSize: '12.5px', fontVariantNumeric: 'tabular-nums' }}>{s.urgencyScore}</td>
                        <td style={{ fontSize: '12px', color: 'var(--t3)' }}>{s.urgencyLevel}</td>
                      </tr>
                    );
                  })}
                  {triageStudents.length === 0 && (
                    <tr>
                      <td colSpan={3}>
                        <div className="empty-state">
                          <div className="empty-rule" />
                          <div><p className="empty-msg">No triage results available.</p></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {/* Standard view header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div className="sage-search">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  placeholder="Search by name, email, or ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {search && (
                <span style={{ fontSize: '12px', color: 'var(--t3)' }}>
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </span>
              )}
              <button className="btn btn-ghost btn-sm" onClick={runTriage} disabled={triageRunning || loading}>
                Run Semester Triage
              </button>
            </div>

            <div className="sage-card">
              {loading ? (
                <div className="loading-state">Loading students…</div>
              ) : triageRunning ? (
                <div style={{ fontSize: '13px', color: 'var(--t4)', padding: '16px 0' }}>
                  Analyzing all assigned students…
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Student ID</th>
                      <th>Major</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(student => (
                      <tr key={student.studentId}>
                        <td>
                          <div className="student-cell">
                            <div className="student-avatar">
                              {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="student-name">{student.name}</div>
                              <div className="student-email">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '12.5px', color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
                          {student.studentNumber || student.studentId}
                        </td>
                        <td style={{ fontSize: '12.5px', color: 'var(--t3)' }}>
                          {student.major?.name || '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link href={`/advisor/students/${student.studentId}`} className="btn btn-ghost-light btn-sm">
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={4}>
                          <div className="empty-state">
                            <div className="empty-rule" />
                            <div>
                              <p className="empty-msg">No students found.</p>
                              <p className="empty-sub">
                                {search ? 'Try a different search term.' : 'No students are assigned to you yet.'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
