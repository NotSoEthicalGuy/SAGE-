'use client';

import React, { useEffect, useState } from 'react';
import { getStudentPosNew } from '@/lib/api';
import { getAuthUser } from '@/lib/auth';

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

export default function StudentPosPage() {
  const [pos, setPos] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getAuthUser();
    if (!user?.studentId) { setLoading(false); return; }
    getStudentPosNew(user.studentId)
      .then(data => setPos(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handlePrint() {
    document.body.classList.add('pos-print');
    window.print();
    setTimeout(() => document.body.classList.remove('pos-print'), 100);
  }

  return (
    <>
      <style>{`
        @media print {
          body.pos-print .sage-sidebar,
          body.pos-print .sage-page-header,
          body.pos-print .pos-no-print { display: none !important; }
          body.pos-print #pos-content { display: block !important; }
        }
      `}</style>

      <div className="sage-page-header">
        <div className="sage-page-title">Program of Study</div>
        <div className="sage-page-sub">Your major requirements and degree progress.</div>
      </div>

      <div className="sage-body" id="pos-content">
        {loading ? (
          <div className="loading-state">Loading program of study…</div>
        ) : !pos ? (
          <div className="sage-card">
            <div className="empty-state">
              <div className="empty-rule" />
              <div><p className="empty-msg">No program of study configured for your major.</p></div>
            </div>
          </div>
        ) : (
          <>
            {/* Legend + print */}
            <div className="pos-no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <LegendItem color="none" label="Not Registered" />
                <LegendItem color="rgba(156,163,175,0.35)" label="Registered" />
                <LegendItem color="rgba(134,197,134,0.35)" label="Completed" />
                <LegendItem color="rgba(239,150,150,0.35)" label="Failed" />
              </div>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }} onClick={handlePrint}>
                Print
              </button>
            </div>

            {/* Credits summary */}
            <div style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '16px' }}>
              Credits: <strong style={{ color: 'var(--t1)' }}>{pos.totalCreditsPassed}</strong>{' / '}<strong style={{ color: 'var(--t1)' }}>{pos.totalCreditsRequired}</strong>
            </div>

            {/* Groups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pos.groups.map((group: any) => (
                <div key={group.groupName} style={{ overflow: 'hidden', border: '1px solid var(--ob-2)', borderRadius: '6px' }}>
                  {/* Group header */}
                  <div style={{
                    background: 'var(--ob-3)', padding: '10px 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--t1)' }}>{group.groupName}</span>
                    <span style={{ fontSize: '12px', color: 'var(--t3)' }}>
                      Passed Credits / Out Of{' '}
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
              {pos.groups.length === 0 && (
                <div className="sage-card">
                  <div className="empty-state">
                    <div className="empty-rule" />
                    <div><p className="empty-msg">No requirements configured for your major.</p></div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
