'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStudentPosNew } from '@/lib/api';

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

export default function AdvisorProgramOfStudyPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;
  const router = useRouter();
  const [pos, setPos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getStudentPosNew(studentId);
        setPos(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load program of study');
      } finally {
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--t4)', fontSize: '13px' }}>
      Loading program of study…
    </div>
  );

  if (error) return (
    <div style={{ padding: '24px', color: 'var(--red-dot)', fontSize: '13px' }}>{error}</div>
  );

  if (!pos) return (
    <div style={{ padding: '24px', color: 'var(--t4)', fontSize: '13px' }}>No program of study found.</div>
  );

  const { totalCreditsPassed, totalCreditsRequired, groups } = pos;

  return (
    <>
      <div className="sage-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px 0', color: 'var(--t4)' }}
            onClick={() => router.push('/advisor/student-information')}
          >
            ← Back
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div className="sage-page-title">Program of Study</div>
            <div className="sage-page-sub">Student ID: {studentId}</div>
          </div>
        </div>
      </div>

      <div className="sage-body">
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
      </div>
    </>
  );
}
