'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStudents, getInterventionEffectiveness } from '../../../lib/api';
import { getAuthUser } from '../../../lib/auth';
import type { DriftLevel } from '../../../../shared/types';

const DOT_COLOR: Record<DriftLevel, string> = {
  on_track:      'var(--green-dot)',
  early_warning: 'var(--yellow-dot)',
  drifting:      'var(--orange-dot)',
  critical:      'var(--red-dot)',
};

const SCORE_COLOR: Record<DriftLevel, string> = {
  on_track:      'var(--green)',
  early_warning: 'var(--yellow)',
  drifting:      'var(--orange)',
  critical:      'var(--red)',
};

const DRIFT_LABEL: Record<DriftLevel, string> = {
  on_track:      'On Track',
  early_warning: 'Early Warning',
  drifting:      'Drifting',
  critical:      'Critical',
};

const ROW_CLASS: Record<DriftLevel, string> = {
  critical:      'row-critical',
  drifting:      'row-drifting',
  early_warning: 'row-warning',
  on_track:      'row-on-track',
};

const CIRC = 2 * Math.PI * 34;

function DriftRing({ total, onTrack, drifting, critical }: {
  total: number; onTrack: number; drifting: number; critical: number;
}) {
  const seg = (n: number) => total > 0 ? (n / total) * CIRC : 0;
  const trackLen = seg(onTrack);
  const driftLen = seg(drifting);
  const critLen  = seg(critical);
  const offset   = CIRC / 4;

  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r="34" fill="none" stroke="#27272a" strokeWidth="10" />
      {onTrack > 0 && (
        <circle cx="45" cy="45" r="34" fill="none" stroke="var(--green-dot)" strokeWidth="10"
          strokeDasharray={`${trackLen} ${CIRC - trackLen}`}
          strokeDashoffset={offset} />
      )}
      {drifting > 0 && (
        <circle cx="45" cy="45" r="34" fill="none" stroke="var(--orange-dot)" strokeWidth="10"
          strokeDasharray={`${driftLen} ${CIRC - driftLen}`}
          strokeDashoffset={offset - trackLen} />
      )}
      {critical > 0 && (
        <circle cx="45" cy="45" r="34" fill="none" stroke="var(--red-dot)" strokeWidth="10"
          strokeDasharray={`${critLen} ${CIRC - critLen}`}
          strokeDashoffset={offset - trackLen - driftLen} />
      )}
      <text x="45" y="49" textAnchor="middle" fill="#fafafa"
        fontSize="22" fontWeight="900" fontFamily="Inter, sans-serif">
        {total}
      </text>
      <text x="45" y="59" textAnchor="middle" fill="#52525b"
        fontSize="8" fontFamily="Inter, sans-serif" letterSpacing="0.08em">
        TOTAL
      </text>
    </svg>
  );
}

type Student = any;

export default function AdvisorDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [interventionEffectiveness, setInterventionEffectiveness] = useState<any[]>([]);
  const [effectivenessLoading, setEffectivenessLoading] = useState(true);
  const user = getAuthUser();

  useEffect(() => {
    getStudents()
      .then(data => setStudents(data as Student[]))
      .finally(() => setLoading(false));
    getInterventionEffectiveness()
      .then((data: any) => setInterventionEffectiveness(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setEffectivenessLoading(false));
  }, []);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.major?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const total    = students.length;
  const critical = students.filter(s => s.aiReports?.[0]?.driftLevel === 'critical').length;
  const drifting = students.filter(s => s.aiReports?.[0]?.driftLevel === 'drifting').length;
  const warning  = students.filter(s => s.aiReports?.[0]?.driftLevel === 'early_warning').length;
  const onTrack  = students.filter(s => s.aiReports?.[0]?.driftLevel === 'on_track').length;

  const flagged = students
    .filter(s => s.aiReports?.[0]?.driftLevel && s.aiReports[0].driftLevel !== 'on_track')
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, drifting: 1, early_warning: 2 };
      return (order[a.aiReports[0].driftLevel] ?? 3) - (order[b.aiReports[0].driftLevel] ?? 3);
    })
    .slice(0, 4);

  return (
    <>
      {/* Dark hero */}
      <div className="sage-hero">
        <div className="sage-hero-top">
          <div>
            <div className="sage-hero-heading">My Students</div>
            <div className="sage-hero-sub">
              {user?.name ? `${user.name} — ` : ''}Monitoring {total} assigned students
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div className="sage-search" style={{ background: 'rgba(255,255,255,.06)', borderColor: 'rgba(255,255,255,.1)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ob-5)" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                placeholder="Search students…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ color: '#e4e4e7', background: 'transparent' }}
              />
            </div>
            <button className="btn btn-amber" style={{ fontSize: '12px' }}>
              Run AI Analysis
            </button>
          </div>
        </div>

        <div className="sage-stat-strip">
          <div className="sage-stat">
            <div className="sage-stat-number" style={{ color: '#fafafa' }}>{total}</div>
            <div className="sage-stat-label">
              <span className="sage-stat-pip" style={{ background: 'var(--ob-4)' }} />
              Total Students
            </div>
          </div>
          <div className="sage-stat">
            <div className="sage-stat-number" style={{ color: 'var(--green-dot)' }}>{onTrack}</div>
            <div className="sage-stat-label">
              <span className="sage-stat-pip" style={{ background: 'var(--green-dot)' }} />
              On Track
            </div>
          </div>
          <div className="sage-stat">
            <div className="sage-stat-number" style={{ color: 'var(--orange-dot)' }}>{drifting}</div>
            <div className="sage-stat-label">
              <span className="sage-stat-pip" style={{ background: 'var(--orange-dot)' }} />
              Drifting
            </div>
          </div>
          <div className="sage-stat">
            <div className="sage-stat-number" style={{ color: 'var(--red-dot)' }}>{critical}</div>
            <div className="sage-stat-label">
              <span className="sage-stat-pip" style={{ background: 'var(--red-dot)' }} />
              Critical
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="sage-body" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px' }}>
        {/* Left column: student table + intervention insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="sage-card">
          <div className="sage-card-header">
            <div className="sage-card-title">Students</div>
            {search && (
              <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          {loading ? (
            <div className="loading-state">Loading students…</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Major</th>
                  <th>Sem</th>
                  <th>GPA</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Analyzed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(student => {
                  const report = student.aiReports?.[0];
                  const level  = report?.driftLevel as DriftLevel | undefined;
                  const rowCls = level ? ROW_CLASS[level] : 'row-on-track';
                  return (
                    <tr key={student.studentId} className={rowCls}>
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
                      <td style={{ fontSize: '12.5px', color: 'var(--t3)' }}>
                        {student.major?.name || '—'}
                      </td>
                      <td style={{ fontSize: '12.5px', color: 'var(--t3)' }}>
                        S{student.currentSemester || '—'}
                      </td>
                      <td>
                        <span className="gpa-value" style={{
                          color: student.cumulativeGpa < 2 ? 'var(--red)' : 'var(--t1)',
                        }}>
                          {student.cumulativeGpa?.toFixed(2) ?? '—'}
                        </span>
                      </td>
                      <td>
                        {level ? (
                          <span className="dot-status">
                            <span className="dot" style={{ background: DOT_COLOR[level] }} />
                            {DRIFT_LABEL[level]}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--t4)', fontSize: '12px' }}>Not analyzed</span>
                        )}
                      </td>
                      <td>
                        {report ? (
                          <>
                            <span className="drift-score" style={{ color: level ? SCORE_COLOR[level] : 'var(--t3)' }}>
                              {(report.driftScore * 100).toFixed(0)}
                            </span>
                            <span className="drift-pct">%</span>
                          </>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '11px', color: 'var(--t4)' }}>
                        {report ? new Date(report.generatedAt).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <Link href={`/advisor/students/${student.studentId}`} className="btn btn-ghost-light btn-sm">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-rule" />
                        <div>
                          <p className="empty-msg">No students match your search.</p>
                          <p className="empty-sub">Try a different name, email, or major.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Intervention Insights */}
        <div className="sage-card">
          <div className="sage-card-header">
            <span className="sage-card-title">Intervention Insights</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--t4)', marginBottom: '12px' }}>
            Effectiveness is measured as drift score change between intervention and next AI analysis.
          </div>
          {effectivenessLoading ? (
            <div className="loading-state">Loading…</div>
          ) : interventionEffectiveness.length === 0 ? (
            <div className="empty-state">
              <div className="empty-rule" />
              <div><p className="empty-msg">No intervention data yet.</p></div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Intervention Type</th>
                  <th>Times Used</th>
                  <th>Avg Effectiveness</th>
                  <th>Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {interventionEffectiveness.map((row: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontSize: '13px', fontWeight: 500, color: 'var(--t1)' }}>{row.interventionType}</td>
                    <td style={{ fontSize: '12.5px', color: 'var(--t3)' }}>{row.count}</td>
                    <td style={{ fontSize: '12.5px', color: row.avgEffectiveness > 0 ? 'var(--green)' : row.avgEffectiveness < 0 ? 'var(--red-dot)' : 'var(--t3)' }}>
                      {row.avgEffectiveness > 0 ? '+' : ''}{row.avgEffectiveness.toFixed(2)}
                    </td>
                    <td style={{ fontSize: '12.5px', color: 'var(--t3)' }}>{row.successRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* AI Flags panel */}
          <div className="sage-dark-card">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ob-3)', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#e4e4e7' }}>AI Flags</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="dot pulse" style={{ background: '#4ade80', width: '5px', height: '5px' }} />
                <span style={{ fontSize: '10px', color: 'var(--ob-5)', fontWeight: 500 }}>Live</span>
              </div>
            </div>
            <div style={{ padding: '8px 0', position: 'relative', zIndex: 1 }}>
              {flagged.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-rule" style={{ background: 'var(--ob-4)' }} />
                  <div>
                    <p className="empty-msg" style={{ color: '#e4e4e7' }}>No active flags.</p>
                    <p className="empty-sub" style={{ color: 'var(--ob-5)' }}>Run an AI analysis to generate flags.</p>
                  </div>
                </div>
              ) : (
                flagged.map(student => {
                  const report = student.aiReports[0];
                  const level = report.driftLevel as DriftLevel;
                  return (
                    <div key={student.studentId} style={{ padding: '10px 16px', borderBottom: '1px solid var(--ob-3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#e4e4e7' }}>
                          {student.name}
                        </span>
                        <span className="dot-status">
                          <span className="dot" style={{ background: DOT_COLOR[level] }} />
                          <span style={{ fontSize: '11px', color: 'var(--ob-5)' }}>{DRIFT_LABEL[level]}</span>
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ob-5)', lineHeight: 1.4 }}>
                        {report.summary || `Drift score: ${(report.driftScore * 100).toFixed(0)}%`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ padding: '12px 16px', position: 'relative', zIndex: 1 }}>
              <Link href="/advisor/sage" className="btn btn-amber" style={{ width: '100%', justifyContent: 'center' }}>
                Open Sage AI →
              </Link>
            </div>
          </div>

          {/* Drift ring */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">Drift Overview</div>
            </div>
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <DriftRing total={total} onTrack={onTrack} drifting={drifting} critical={critical} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {([
                  ['On Track',      'var(--green-dot)',  onTrack],
                  ['Drifting',      'var(--orange-dot)', drifting],
                  ['Critical',      'var(--red-dot)',    critical],
                  ['Early Warning', 'var(--yellow-dot)', warning],
                ] as [string, string, number][]).map(([label, color, count]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span className="dot" style={{ background: color }} />
                    <span style={{ fontSize: '12px', color: 'var(--t3)', flex: 1 }}>{label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
