'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  getStudent,
  getStudentPosProgress,
  getStudentAcademicStanding,
  getStudentGradeTrend,
  getStudentRecommendedCourses,
  getStudentAdvisorMessages,
  getStudentAppointments,
} from '@/lib/api';
import { getAuthUser } from '@/lib/auth';

const LETTER_COLORS: Record<string, string> = {
  A: 'var(--green)', B: 'var(--green)', C: 'var(--yellow)',
  D: 'var(--orange)', F: 'var(--red)', W: 'var(--t3)', IP: 'var(--t3)',
};

const LETTER_GPA: Record<string, number> = {
  'A+': 4.0, A: 4.0, 'A-': 3.7,
  'B+': 3.3, B: 3.0, 'B-': 2.7,
  'C+': 2.3, C: 2.0, 'C-': 1.7,
  'D+': 1.3, D: 1.0, 'D-': 0.7,
  F: 0.0,
};

export default function DashboardPage() {
  const user = useMemo(() => getAuthUser(), []);
  const [student, setStudent] = useState<any>(null);
  const [posProgress, setPosProgress] = useState<any>(null);
  const [standing, setStanding] = useState<any>(null);
  const [gradeTrend, setGradeTrend] = useState<any>(null);
  const [recommendedCourses, setRecommendedCourses] = useState<any>(null);
  const [advisorMessages, setAdvisorMessages] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const STANDING_DOT: Record<string, string> = {
    deans_list: 'var(--ob)',
    good:       'var(--green-dot)',
    warning:    'var(--yellow-dot)',
    probation:  'var(--red-dot)',
  };

  useEffect(() => {
    if (!user?.studentId) { setLoading(false); return; }
    const id = user.studentId;

    Promise.allSettled([
      getStudent(id),
      getStudentPosProgress(id),
      getStudentAcademicStanding(id),
      getStudentGradeTrend(id),
      getStudentRecommendedCourses(id),
      getStudentAdvisorMessages(id),
      getStudentAppointments(id),
    ]).then(([r0, r1, r2, r3, r4, r5, r6]) => {
      if (r0.status === 'fulfilled') setStudent(r0.value);
      if (r1.status === 'fulfilled') setPosProgress(r1.value);
      if (r2.status === 'fulfilled') setStanding(r2.value);
      if (r3.status === 'fulfilled') setGradeTrend(r3.value);
      if (r4.status === 'fulfilled') setRecommendedCourses(r4.value);
      if (r5.status === 'fulfilled') setAdvisorMessages(r5.value?.flags ?? []);
      if (r6.status === 'fulfilled') setAppointments(r6.value ?? []);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="sage-body">
        <div className="loading-state">Loading dashboard…</div>
      </div>
    );
  }

  const enrollments = student?.enrollments || [];
  // "Currently taking" — exclude finished, withdrawn, dropped, failed.
  // Used for Schedule This Week and the credits-this-semester stat
  // so already-taken courses don't show up there.
  const ACTIVE_STATUSES = new Set(['in_progress', 'approved', 'registered', 'pending']);
  const activeEnrollments = enrollments.filter(
    (e: any) => ACTIVE_STATUSES.has(e.status) && e.finalGrade == null,
  );
  const cumGpa = student?.cumulativeGpa?.toFixed(2) ?? '—';
  const credits = activeEnrollments.reduce(
    (s: number, e: any) => s + (e.course?.credits || 0),
    0,
  );

  return (
    <>
      {/* Light page header */}
      <div className="sage-page-header">
        <div className="sage-page-title">Dashboard</div>
        <div className="sage-page-sub">Spring 25–26 · Academic Overview</div>
      </div>

      {/* GPA stat strip */}
      <div style={{ background: 'var(--surf)', borderBottom: '1px solid var(--border)', display: 'flex' }}>
        <div style={{ padding: '14px 32px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: '4px' }}>
            Cumulative GPA
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1.5px', color: 'var(--am-2)', fontVariantNumeric: 'tabular-nums' }}>
            {cumGpa}
          </div>
        </div>
        <div style={{ padding: '14px 32px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: '4px' }}>
            Credits This Semester
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1.5px', color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>
            {credits}
          </div>
        </div>
        <div style={{ padding: '14px 32px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: '4px' }}>
            Status
          </div>
          <div style={{ paddingTop: '6px' }}>
            <span className="dot-status">
              <span className="dot" style={{ background: 'var(--green-dot)' }} />
              Enrolled
            </span>
          </div>
        </div>
      </div>

      <div className="sage-body" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '16px' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Grade Trend by Semester */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t4)' }}>
                Grade Trend by Semester
              </div>
            </div>
            <div style={{ padding: '16px 24px', height: '148px', display: 'flex', alignItems: 'center' }}>
              {!gradeTrend || !gradeTrend.hasEnoughData ? (
                <p className="empty-sub" style={{ margin: 0 }}>
                  Not enough data yet — trend will appear after your second semester.
                </p>
              ) : (() => {
                const { semesters } = gradeTrend;
                const PAD_L = 24, PAD_R = 24, PAD_T = 8, PAD_B = 28;
                const W = 400, H = 120;
                const chartW = W - PAD_L - PAD_R;
                const chartH = H - PAD_T - PAD_B;
                const n = semesters.length;

                const xs = semesters.map((_: any, i: number) =>
                  n === 1 ? PAD_L + chartW / 2 : PAD_L + (i / (n - 1)) * chartW
                );
                const ys = semesters.map((s: any) =>
                  PAD_T + chartH - (Math.min(100, Math.max(0, s.avgGrade)) / 100) * chartH
                );

                const lastDiff = n >= 2
                  ? semesters[n - 1].avgGrade - semesters[n - 2].avgGrade
                  : 0;
                const lastColor = lastDiff < 0 ? 'var(--am)' : lastDiff > 0 ? 'var(--green)' : 'var(--t2)';

                const segments = semesters.slice(0, -1).map((_: any, i: number) => ({
                  x1: xs[i], y1: ys[i], x2: xs[i + 1], y2: ys[i + 1],
                  color: i === n - 2 ? lastColor : 'var(--t2)',
                }));

                const dotColors = semesters.map((_: any, i: number) => {
                  if (i === n - 1) return lastColor;
                  if (i === n - 2 && n >= 2) return lastColor;
                  return 'var(--t2)';
                });

                return (
                  <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
                    {/* Baseline */}
                    <line
                      x1={PAD_L} y1={PAD_T + chartH}
                      x2={W - PAD_R} y2={PAD_T + chartH}
                      stroke="var(--border)" strokeWidth="1"
                    />
                    {/* Segments */}
                    {segments.map((seg: any, i: number) => (
                      <line key={i}
                        x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                        stroke={seg.color} strokeWidth="2" strokeLinecap="round"
                      />
                    ))}
                    {/* Data points */}
                    {semesters.map((_: any, i: number) => (
                      <circle key={i} cx={xs[i]} cy={ys[i]} r="4" fill={dotColors[i]} />
                    ))}
                    {/* X labels */}
                    {semesters.map((s: any, i: number) => (
                      <text key={i}
                        x={xs[i]} y={PAD_T + chartH + 16}
                        textAnchor="middle" fontSize="9" fill="var(--t4)"
                        fontFamily="Inter, sans-serif"
                      >
                        {s.label}
                      </text>
                    ))}
                  </svg>
                );
              })()}
            </div>
          </div>

          {/* Schedule table */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">Schedule This Week</div>
            </div>
            {activeEnrollments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-rule" />
                <div>
                  <p className="empty-msg">No enrolled courses.</p>
                  <p className="empty-sub">Register for courses to see your schedule here.</p>
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Credits</th>
                    <th>Mon</th>
                    <th>Tue</th>
                    <th>Wed</th>
                    <th>Thu</th>
                    <th>Fri</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEnrollments.map((e: any, idx: number) => {
                    // Section schedule lives on e.section, not e.schedule.
                    const sec = e.section || {};
                    const days: string[] = Array.isArray(sec.scheduleDays) ? sec.scheduleDays : [];
                    const meetsOn = (col: string) =>
                      days.some((d: string) => d.toLowerCase().startsWith(col));
                    const timeLabel =
                      sec.scheduleStartTime && sec.scheduleEndTime
                        ? `${sec.scheduleStartTime}–${sec.scheduleEndTime}`
                        : '✓';
                    return (
                      <tr key={`${e.course?.code}-${idx}`}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--t1)' }}>
                            {e.course?.code || 'N/A'}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--t4)' }}>
                            {e.course?.name || ''}
                          </div>
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--t3)' }}>{e.course?.credits || '—'}</td>
                        {['mon', 'tue', 'wed', 'thu', 'fri'].map(day => (
                          <td
                            key={day}
                            style={{
                              fontSize: '11px',
                              color: meetsOn(day) ? 'var(--t2)' : 'var(--t4)',
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {meetsOn(day) ? timeLabel : '–'}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Suggested for Next Semester */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">Suggested for Next Semester</div>
            </div>
            {(!recommendedCourses || recommendedCourses.courses.length === 0) ? (
              <div className="empty-state">
                <div className="empty-rule" />
                <div>
                  <p className="empty-msg">No eligible courses found — your advisor will assist with planning.</p>
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Name</th>
                    <th>Credits</th>
                    <th>Rec. Semester</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendedCourses.courses.map((c: any) => (
                    <tr key={c.code}>
                      <td style={{ fontWeight: 700, fontSize: '13px' }}>{c.code}</td>
                      <td style={{ color: 'var(--t2)' }}>{c.name}</td>
                      <td style={{ color: 'var(--t3)' }}>{c.credits}</td>
                      <td style={{ color: 'var(--t3)' }}>Semester {c.recommendedSemester}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Current grades */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">Current Grades</div>
            </div>
            {enrollments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-rule" />
                <div>
                  <p className="empty-msg">No grade data available.</p>
                  <p className="empty-sub">Grades appear after courses are graded.</p>
                </div>
              </div>
            ) : (
              <div style={{ padding: '0' }}>
                {enrollments.map((e: any, idx: number) => {
                  const letter = e.letterGrade || 'IP';
                  const gpa    = LETTER_GPA[letter];
                  const color  = LETTER_COLORS[letter[0]] || 'var(--t3)';
                  const pct    = gpa != null ? (gpa / 4.0) * 100 : 0;
                  return (
                    <div key={`grade-${idx}`} style={{
                      padding: '12px 24px',
                      borderBottom: idx < enrollments.length - 1 ? '1px solid #ebebed' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t1)' }}>
                          {e.course?.code || 'N/A'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--t4)', marginTop: '1px' }}>
                          {e.course?.name || ''}
                        </div>
                      </div>
                      {/* Grade bar */}
                      <div style={{ width: '80px', height: '3px', background: 'var(--border)', borderRadius: '2px', flexShrink: 0 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }} />
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color, width: '28px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {letter}
                      </div>
                      {gpa != null && (
                        <div style={{ fontSize: '11px', color: 'var(--t4)', width: '28px', textAlign: 'right' }}>
                          {gpa.toFixed(1)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="dashboard-right-col" style={{
          display: 'flex', flexDirection: 'column', gap: '16px',
          position: 'sticky', top: '24px', alignSelf: 'start',
        }}>
          {/* Student info card */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">Student Info</div>
            </div>
            {standing && (
              <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="dot" style={{ background: STANDING_DOT[standing.standing] ?? 'var(--t4)' }} />
                <span style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--t3)',
                }}>
                  {standing.label}
                </span>
              </div>
            )}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                ['Student ID',   user?.studentNumber || user?.studentId || 'N/A'],
                ['College',      student?.college?.name || 'Faculty of Arts and Sciences'],
                ['Major',        student?.major?.name || 'BS Computer Science'],
                ['Year Level',   student?.yearLevel || 'Senior'],
                ['Study Plan',   student?.studyPlan || 'BSCS-2021'],
                ['Advisor',      student?.advisor?.name || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: '2px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--t1)', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Degree Completion Ring */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">Degree Progress</div>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              {posProgress ? (() => {
                const pct = posProgress.pct;
                const r = 48;
                const circ = 2 * Math.PI * r;
                const offset = circ * (1 - pct / 100);
                return (
                  <>
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
                      <circle
                        cx="60" cy="60" r={r}
                        fill="none"
                        stroke="var(--am)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        transform="rotate(-90 60 60)"
                      />
                      <text
                        x="60" y="66"
                        textAnchor="middle"
                        fontSize="22"
                        fontWeight="900"
                        fill="var(--t1)"
                        fontFamily="Inter, sans-serif"
                      >
                        {pct}%
                      </text>
                    </svg>
                    <div style={{ fontSize: '12px', color: posProgress.onTrack ? 'var(--t3)' : 'var(--am-2)', textAlign: 'center' }}>
                      {posProgress.onTrack
                        ? `On track to graduate in ${posProgress.graduationEstimate ?? '—'}`
                        : 'Graduation may be delayed — speak with your advisor'}
                    </div>
                  </>
                );
              })() : (
                <div className="empty-sub" style={{ padding: '20px 0' }}>Progress unavailable.</div>
              )}
            </div>
          </div>

          {/* From Your Advisor */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">From Your Advisor</div>
            </div>
            {(!advisorMessages || advisorMessages.length === 0) ? (
              <p className="empty-sub" style={{ padding: '14px 20px', margin: 0 }}>
                No messages from your advisor.
              </p>
            ) : (
              <div>
                {advisorMessages.map((flag: any, idx: number) => (
                  <div key={flag.flagId} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    padding: '10px 20px',
                    borderBottom: idx < advisorMessages.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontSize: '13px', color: 'var(--t1)', flex: 1, marginRight: '12px' }}>
                      {flag.note}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--t4)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {new Date(flag.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Holds */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">Holds</div>
            </div>
            <div style={{ padding: '14px 20px' }}>
              {student?.holds && student.holds.length > 0 ? (
                student.holds.map((hold: any, i: number) => (
                  <div key={i} className="dot-status" style={{ marginBottom: '6px' }}>
                    <span className="dot" style={{ background: 'var(--red-dot)' }} />
                    {hold.description || hold.type}
                  </div>
                ))
              ) : (
                <span className="dot-status">
                  <span className="dot" style={{ background: 'var(--green-dot)' }} />
                  No active holds
                </span>
              )}
            </div>
          </div>

          {/* Dues balance */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">Financial</div>
            </div>
            <div style={{ padding: '14px 20px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: '6px' }}>
                Dues Balance
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                {student?.duesBalance ?? 'LBP 0 / USD -4'}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .dashboard-right-col {
            position: static !important;
          }
          .sage-body > [style] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
