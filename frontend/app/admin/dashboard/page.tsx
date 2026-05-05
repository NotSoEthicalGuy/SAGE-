'use client';

import { useEffect, useState } from 'react';
import { getStats, getAdvisors } from '../../../lib/api';

interface Stats {
  totalStudents: number;
  totalAdvisors: number;
  totalMajors: number;
  totalCourses: number;
  driftDistribution: Record<string, number>;
}

const DRIFT_LABELS: Record<string, string> = {
  on_track:      'On Track',
  early_warning: 'Early Warning',
  drifting:      'Drifting',
  critical:      'Critical',
};

const DOT_COLORS: Record<string, string> = {
  on_track:      'var(--green-dot)',
  early_warning: 'var(--yellow-dot)',
  drifting:      'var(--orange-dot)',
  critical:      'var(--red-dot)',
};

const BAR_COLORS: Record<string, string> = {
  on_track:      'var(--green)',
  early_warning: 'var(--yellow)',
  drifting:      'var(--orange)',
  critical:      'var(--red)',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [s, a] = await Promise.all([getStats(), getAdvisors()]);
        setStats(s);
        setAdvisors(a);
      } catch (e: any) {
        setError(e?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Dashboard</div>
        <div className="sage-page-sub">System-wide overview</div>
      </div>

      <div className="sage-body">
        {error && (
          <div style={{
            marginBottom: '12px', padding: '10px 14px', borderRadius: '3px',
            background: 'rgba(185,28,28,.08)', border: '1px solid rgba(185,28,28,.2)',
            fontSize: '13px', color: 'var(--red)',
          }}>
            {error}
          </div>
        )}
        {loading ? (
          <div className="loading-state">Loading…</div>
        ) : (
          <>
            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                ['Total Students', stats?.totalStudents ?? 0],
                ['Advisors',       stats?.totalAdvisors ?? 0],
                ['Majors',         stats?.totalMajors ?? 0],
                ['Courses',        stats?.totalCourses ?? 0],
              ].map(([label, value]) => (
                <div key={label as string} className="sage-card" style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>
                    {value}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t4)', marginTop: '4px' }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Drift distribution */}
              <div className="sage-card">
                <div className="sage-card-header">
                  <span className="sage-card-title">Drift Distribution (Last 30 Days)</span>
                </div>
                <div style={{ padding: '16px 24px' }}>
                  {stats && Object.entries(stats.driftDistribution).map(([level, count]) => {
                    const total = Object.values(stats.driftDistribution).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={level} style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span className="dot-status">
                            <span className="dot" style={{ background: DOT_COLORS[level] }} />
                            {DRIFT_LABELS[level] || level}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--t3)' }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px' }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: BAR_COLORS[level] || 'var(--t3)',
                            borderRadius: '2px',
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                  {stats && Object.values(stats.driftDistribution).every(v => v === 0) && (
                    <div className="empty-state">
                      <div className="empty-rule" />
                      <div>
                        <p className="empty-msg">No AI reports in the last 30 days.</p>
                        <p className="empty-sub">Run analyses to populate drift data.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Advisor roster */}
              <div className="sage-card">
                <div className="sage-card-header">
                  <span className="sage-card-title">Advisor Roster</span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advisors.map((a) => (
                      <tr key={a.advisorId}>
                        <td>
                          <div className="student-cell">
                            <div className="student-avatar">
                              {a.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--t1)' }}>{a.name}</div>
                          </div>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--t3)' }}>{a.email}</td>
                        <td>
                          <span className="badge badge-amber">{a.students?.length ?? 0}</span>
                        </td>
                      </tr>
                    ))}
                    {advisors.length === 0 && (
                      <tr>
                        <td colSpan={3}>
                          <div className="empty-state">
                            <div className="empty-rule" />
                            <div>
                              <p className="empty-msg">No advisors yet.</p>
                              <p className="empty-sub">Add advisors to populate this list.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
