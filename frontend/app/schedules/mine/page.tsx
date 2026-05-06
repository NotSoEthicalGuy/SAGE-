'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getStudentSchedule,
  getStudentProfile,
  getStudentPrerequisiteViolations,
} from '@/lib/api';
import { getAuthUser } from '@/lib/auth';

const ACTIVE_STATUSES = new Set(['in_progress', 'approved', 'registered', 'pending']);

const DAY_TO_CODE: Record<string, string> = {
  monday: 'M', mon: 'M', m: 'M',
  tuesday: 'T', tue: 'T', tues: 'T', t: 'T',
  wednesday: 'W', wed: 'W', w: 'W',
  thursday: 'Th', thu: 'Th', thur: 'Th', thurs: 'Th', th: 'Th',
  friday: 'F', fri: 'F', f: 'F',
  saturday: 'Sa', sat: 'Sa', sa: 'Sa',
  sunday: 'Su', sun: 'Su', su: 'Su',
};

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function formatDays(days?: string[]): string {
  if (!days || days.length === 0) return '—';
  const lower = new Set(days.map((d) => d.toLowerCase()));
  const codes = DAY_ORDER.filter((d) => lower.has(d) || lower.has(DAY_TO_CODE[d]?.toLowerCase()))
    .map((d) => DAY_TO_CODE[d]);
  return codes.length ? codes.join('') : days.join(', ');
}

function formatTime(start?: string, end?: string): string {
  if (!start || !end) return '—';
  return `${start} – ${end}`;
}

export default function StudentSchedulePage() {
  const user = useMemo(() => getAuthUser(), []);
  const [registered, setRegistered] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [violations, setViolations] = useState<{ courseName: string; missingPrereq: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sched, prof, viol] = await Promise.all([
          getStudentSchedule(),
          getStudentProfile(),
          user?.studentId
            ? getStudentPrerequisiteViolations(user.studentId).catch(() => ({ violations: [] }))
            : Promise.resolve({ violations: [] }),
        ]);
        if (cancelled) return;
        const list = Array.isArray((sched as any)?.registeredCourses)
          ? (sched as any).registeredCourses
          : [];
        setRegistered(list);
        setProfile(prof);
        setViolations((viol as any)?.violations ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load schedule');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Only courses currently being taken — exclude completed / failed / withdrawn / dropped
  // and any row that already has a final grade.
  const active = registered.filter(
    (e: any) => ACTIVE_STATUSES.has(e.status) && e.finalGrade == null,
  );
  const totalCredits = active.reduce((s, e) => s + (e.course?.credits || 0), 0);

  const studentName = profile?.name || user?.name || '—';
  const studentNumber = profile?.studentNumber || user?.studentNumber || user?.studentId || '—';
  const advisorName = profile?.advisor?.name || '—';
  const semesterLabel = active[0]?.section?.semester || 'Current Semester';

  return (
    <>
      <div className="sage-page-header no-print-extras">
        <div className="sage-page-title">Student Schedule</div>
        <div className="sage-page-sub">{semesterLabel}</div>
      </div>

      <div
        className="sage-body schedule-print-area"
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {/* Identification banner */}
        <div className="sage-card" style={{ padding: '14px 24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t1)' }}>
            Student: {studentNumber} — {studentName}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '2px' }}>
            Advisor: {advisorName}
          </div>
        </div>

        {/* Prerequisite warnings */}
        {violations.length > 0 && (
          <div
            className="sage-card"
            style={{ padding: '12px 20px', borderLeft: '3px solid var(--am)' }}
          >
            {violations.map((v, i) => (
              <div
                key={i}
                style={{
                  fontSize: '12.5px',
                  color: 'var(--t2)',
                  marginBottom: i < violations.length - 1 ? '6px' : 0,
                }}
              >
                You are enrolled in {v.courseName} without completing {v.missingPrereq}. Please
                contact your advisor.
              </div>
            ))}
          </div>
        )}

        {/* Print button */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-amber"
            onClick={() => window.print()}
            disabled={loading || active.length === 0}
          >
            Print
          </button>
        </div>

        {/* Schedule table */}
        <div className="sage-card">
          <div className="sage-card-header">
            <div className="sage-card-title">Schedule</div>
          </div>
          {loading ? (
            <div className="loading-state">Loading schedule…</div>
          ) : error ? (
            <div className="empty-state">
              <div className="empty-rule" />
              <div>
                <p className="empty-msg">{error}</p>
              </div>
            </div>
          ) : active.length === 0 ? (
            <div className="empty-state">
              <div className="empty-rule" />
              <div>
                <p className="empty-msg">No registered courses for this semester.</p>
                <p className="empty-sub">Register for courses to see your schedule here.</p>
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Crs. #</th>
                  <th>Title</th>
                  <th style={{ textAlign: 'center' }}>Credits</th>
                  <th>Room</th>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Instructor</th>
                </tr>
              </thead>
              <tbody>
                {active.map((e: any) => (
                  <tr key={e.enrollmentId}>
                    <td style={{ fontWeight: 700, color: 'var(--t1)' }}>
                      {e.course?.code || '—'}
                    </td>
                    <td>{e.course?.title || e.course?.name || '—'}</td>
                    <td style={{ textAlign: 'center', color: 'var(--t2)' }}>
                      {e.course?.credits ?? '—'}
                    </td>
                    <td style={{ color: 'var(--t2)' }}>{e.section?.scheduleRoom || '—'}</td>
                    <td style={{ color: 'var(--t2)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatDays(e.section?.scheduleDays)}
                    </td>
                    <td style={{ color: 'var(--t2)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatTime(e.section?.scheduleStartTime, e.section?.scheduleEndTime)}
                    </td>
                    <td style={{ color: 'var(--t2)' }}>{e.section?.instructorName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Totals strip */}
        {active.length > 0 && (
          <div
            className="sage-card"
            style={{
              padding: '12px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--t4)',
              }}
            >
              Total Credits
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--t1)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {totalCredits}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .sage-sidebar, .no-print { display: none !important; }
          .sage-main { margin-left: 0 !important; }
          .sage-body { padding: 0 !important; }
          .sage-card { border: 1px solid #000 !important; box-shadow: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
    </>
  );
}
