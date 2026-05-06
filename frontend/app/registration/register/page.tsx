'use client';

import { useState, useEffect, useMemo } from 'react';
import { getStudentSchedule, batchStudentEnrollment, dropStudentEnrollment } from '@/lib/api';

// ── helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function hasTimeOverlap(a: any, b: any): boolean {
  const aStart = timeToMinutes(a.scheduleStartTime);
  const aEnd   = timeToMinutes(a.scheduleEndTime);
  const bStart = timeToMinutes(b.scheduleStartTime);
  const bEnd   = timeToMinutes(b.scheduleEndTime);
  return aStart < bEnd && bStart < aEnd;
}

function sectionsConflict(a: any, b: any): boolean {
  const aDays: string[] = a.scheduleDays ?? [];
  const bDays: string[] = b.scheduleDays ?? [];
  const sharedDay = aDays.some(d => bDays.includes(d));
  return sharedDay && hasTimeOverlap(a, b);
}

function formatSchedule(s: any): string {
  const days = (s.scheduleDays ?? []).join(', ');
  const time = s.scheduleStartTime && s.scheduleEndTime
    ? `${s.scheduleStartTime}–${s.scheduleEndTime}` : '';
  const room = s.scheduleRoom ? `(${s.scheduleRoom})` : '';
  return [days, time, room].filter(Boolean).join(' ') || '—';
}

const MIN_CREDITS = 9;

// ── component ─────────────────────────────────────────────────────────────────

export default function CourseRegistrationPage() {
  const [schedule, setSchedule]         = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const [majorFilter, setMajorFilter]   = useState<'mine' | 'all'>('mine');
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState<Set<string>>(new Set());

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [registering, setRegistering]   = useState(false);
  const [successMsg, setSuccessMsg]     = useState<string | null>(null);
  const [dropping, setDropping]         = useState<string | null>(null);

  async function reload() {
    try {
      const data = await getStudentSchedule();
      setSchedule(data);
      setSelected(new Set());
      setValidationErrors([]);
      setSuccessMsg(null);
    } catch {
      setError('Failed to load course schedule');
    }
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const availableSections: any[] = schedule?.availableSections ?? [];
  const registeredCourses: any[] = schedule?.registeredCourses ?? [];
  const studentMajorId: string   = schedule?.studentMajorId ?? '';

  // Filter available sections
  const filtered = useMemo(() => {
    let list = majorFilter === 'mine'
      ? availableSections.filter(s => s.course?.major?.majorId === studentMajorId)
      : availableSections;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.course?.code?.toLowerCase().includes(q) ||
        s.course?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [availableSections, majorFilter, search, studentMajorId]);

  // Selected section objects
  const selectedSections = availableSections.filter(s => selected.has(s.sectionId));
  const totalCredits = selectedSections.reduce((sum, s) => sum + (s.course?.credits ?? 0), 0);

  const toggleSection = (sectionId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
      return next;
    });
    setValidationErrors([]);
    setSuccessMsg(null);
  };

  // ── client-side validation ─────────────────────────────────────────────────
  function validate(): string[] {
    const errors: string[] = [];

    if (totalCredits < MIN_CREDITS) {
      errors.push(`Minimum ${MIN_CREDITS} credits required. You have selected ${totalCredits} credit${totalCredits !== 1 ? 's' : ''}.`);
    }

    for (let i = 0; i < selectedSections.length; i++) {
      for (let j = i + 1; j < selectedSections.length; j++) {
        const a = selectedSections[i];
        const b = selectedSections[j];
        if (sectionsConflict(a, b)) {
          errors.push(
            `Schedule conflict: ${a.course?.code} and ${b.course?.code} overlap on ${(a.scheduleDays ?? []).filter((d: string) => (b.scheduleDays ?? []).includes(d)).join(', ')}.`
          );
        }
      }
    }

    return errors;
  }

  // ── register handler ───────────────────────────────────────────────────────
  const handleRegister = async () => {
    const errs = validate();
    if (errs.length > 0) { setValidationErrors(errs); return; }

    setRegistering(true);
    setValidationErrors([]);
    setSuccessMsg(null);
    try {
      await batchStudentEnrollment([...selected]);
      setSuccessMsg(`${selected.size} course${selected.size !== 1 ? 's' : ''} submitted for advisor approval.`);
      await reload();
    } catch (err: any) {
      const details: string[] = err?.details ?? [];
      setValidationErrors([err?.message ?? 'Registration failed', ...details]);
    } finally {
      setRegistering(false);
    }
  };

  const handleDrop = async (enrollmentId: string) => {
    if (!confirm('Drop this course?')) return;
    setDropping(enrollmentId);
    try {
      await dropStudentEnrollment(enrollmentId);
      await reload();
    } catch {
      alert('Failed to drop course');
    } finally {
      setDropping(null);
    }
  };

  if (loading) return <div className="sage-page-header"><div className="sage-page-title">Course Registration</div></div>;

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Course Registration</div>
        <div className="sage-page-sub">Select courses to register for this semester. Minimum {MIN_CREDITS} credits required.</div>
      </div>

      <div className="sage-body" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>

        {/* ── Left: available courses ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '1px solid var(--ob-3)', borderRadius: '6px', overflow: 'hidden' }}>
              {(['mine', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setMajorFilter(f)}
                  className={f === majorFilter ? 'btn btn-amber btn-sm' : 'btn btn-ghost btn-sm'}
                  style={{ borderRadius: 0, border: 'none' }}
                >
                  {f === 'mine' ? 'My Major' : 'All Majors'}
                </button>
              ))}
            </div>
            <div className="sage-search" style={{ flex: 1 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                placeholder="Search by code or name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Available sections table */}
          <div className="sage-card" style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px' }}>
                <div className="empty-msg">No sections available</div>
                <div className="empty-sub">Try switching to All Majors or clearing the search.</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '36px' }} />
                    <th>Course</th>
                    <th>Instructor</th>
                    <th>Schedule</th>
                    <th>Credits</th>
                    <th>Seats</th>
                    {majorFilter === 'all' && <th>Major</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(section => {
                    const isSelected = selected.has(section.sectionId);
                    const full = section.enrolledCount >= section.capacity;
                    return (
                      <tr
                        key={section.sectionId}
                        onClick={() => !full && toggleSection(section.sectionId)}
                        style={{
                          cursor: full ? 'not-allowed' : 'pointer',
                          opacity: full ? 0.5 : 1,
                          background: isSelected ? 'rgba(245,158,11,0.07)' : undefined,
                          borderLeft: isSelected ? '3px solid var(--am)' : '3px solid transparent',
                        }}
                      >
                        <td style={{ paddingLeft: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={full}
                            onChange={() => {}}
                            style={{ accentColor: 'var(--am)', width: '14px', height: '14px' }}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{section.course?.code}</div>
                          <div style={{ fontSize: '11px', color: 'var(--t4)' }}>{section.course?.name}</div>
                        </td>
                        <td style={{ fontSize: '12px' }}>{section.instructorName || '—'}</td>
                        <td style={{ fontSize: '11px', color: 'var(--t3)' }}>{formatSchedule(section)}</td>
                        <td style={{ fontWeight: 500 }}>{section.course?.credits}</td>
                        <td style={{ fontSize: '12px', color: full ? 'var(--red-dot)' : 'var(--t3)' }}>
                          {section.enrolledCount}/{section.capacity}
                          {full && <span style={{ marginLeft: '4px' }}>Full</span>}
                        </td>
                        {majorFilter === 'all' && (
                          <td style={{ fontSize: '11px', color: 'var(--t4)' }}>{section.course?.major?.name}</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Currently registered */}
          {registeredCourses.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Registered this semester
              </div>
              <div className="sage-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {registeredCourses.map((e: any) => (
                      <tr key={e.enrollmentId}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{e.course?.code}</div>
                          <div style={{ fontSize: '11px', color: 'var(--t4)' }}>{e.course?.name}</div>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
                            color: e.status === 'approved' ? 'var(--am)' : 'var(--t4)',
                          }}>
                            {e.status === 'pending' ? 'Awaiting approval' : e.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                          {['pending', 'approved'].includes(e.status) && (
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={dropping === e.enrollmentId}
                              onClick={() => handleDrop(e.enrollmentId)}
                            >
                              {dropping === e.enrollmentId ? 'Dropping…' : 'Drop'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: cart / register panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'sticky', top: '20px' }}>
          <div className="sage-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Selected Courses
            </div>

            {selectedSections.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--t4)', textAlign: 'center', padding: '12px 0' }}>
                No courses selected.<br />Click rows in the table to add.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {selectedSections.map(s => (
                  <div key={s.sectionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{s.course?.code}</div>
                      <div style={{ fontSize: '11px', color: 'var(--t4)' }}>{s.course?.credits} cr</div>
                    </div>
                    <button
                      onClick={() => toggleSection(s.sectionId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: '16px', lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Credit counter */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderTop: '1px solid var(--ob-3)', paddingTop: '10px', marginTop: '4px',
            }}>
              <span style={{ fontSize: '12px', color: 'var(--t3)' }}>Total credits</span>
              <span style={{
                fontWeight: 700, fontSize: '14px',
                color: totalCredits >= MIN_CREDITS ? 'var(--am)' : 'var(--red-dot)',
              }}>
                {totalCredits} / {MIN_CREDITS} min
              </span>
            </div>

            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <div style={{
                marginTop: '10px', padding: '8px 10px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '4px',
              }}>
                {validationErrors.map((e, i) => (
                  <div key={i} style={{ fontSize: '11px', color: '#fca5a5', marginBottom: i < validationErrors.length - 1 ? '4px' : 0 }}>
                    {e}
                  </div>
                ))}
              </div>
            )}

            {/* Success message */}
            {successMsg && (
              <div style={{
                marginTop: '10px', padding: '8px 10px',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: '4px', fontSize: '12px', color: '#86efac',
              }}>
                {successMsg}
              </div>
            )}

            <button
              className="btn btn-amber"
              style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
              disabled={selected.size === 0 || registering}
              onClick={handleRegister}
            >
              {registering ? 'Submitting…' : `Register (${selected.size} course${selected.size !== 1 ? 's' : ''})`}
            </button>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--t4)', lineHeight: 1.6, padding: '0 4px' }}>
            After registering, your courses will show as <strong style={{ color: 'var(--t3)' }}>Awaiting approval</strong> until your advisor confirms them.
          </div>
        </div>
      </div>
    </>
  );
}
