'use client';

import { useEffect, useState, useMemo } from 'react';
import { getAuthUser } from '@/lib/auth';
import { getStudentAppointments, createStudentAppointment } from '@/lib/api';

const TOPICS = ['Academic Planning', 'Course Selection', 'Grade Concern', 'Major Change', 'Other'] as const;
type Topic = typeof TOPICS[number];

const STATUS_STYLE: Record<string, { dotColor: string; textStyle?: React.CSSProperties }> = {
  confirmed: { dotColor: 'var(--t1)' },
  pending:   { dotColor: 'var(--t4)' },
  cancelled: { dotColor: 'var(--t4)', textStyle: { textDecoration: 'line-through', color: 'var(--t3)' } },
};

export default function AppointmentsPage() {
  const user = useMemo(() => getAuthUser(), []);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [topic, setTopic] = useState<Topic>('Academic Planning');
  const [requestedDate, setRequestedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.studentId) { setLoading(false); return; }
    getStudentAppointments(user.studentId)
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const hasPending = appointments.some(a => a.status === 'pending');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.studentId || !requestedDate) return;
    setSubmitting(true);
    setError('');
    try {
      const appt = await createStudentAppointment(user.studentId, {
        topic,
        requestedDate,
        notes: notes || undefined,
      });
      setAppointments(prev => [appt, ...prev]);
      setRequestedDate('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="sage-body"><div className="loading-state">Loading…</div></div>;

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Appointments</div>
        <div className="sage-page-sub">Request and track advisor meetings.</div>
      </div>

      <div className="sage-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* History table */}
        <div className="sage-card">
          <div className="sage-card-header">
            <div className="sage-card-title">Your Requests</div>
          </div>
          {appointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-rule" />
              <div>
                <p className="empty-msg">No appointment requests yet.</p>
                <p className="empty-sub">Use the form below to submit your first request.</p>
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Requested Date</th>
                  <th>Status</th>
                  <th>Advisor Response</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a: any) => {
                  const s = STATUS_STYLE[a.status] ?? STATUS_STYLE.pending;
                  const responseText = a.advisorResponse || a.cancellationReason;
                  return (
                    <tr key={a.appointmentId}>
                      <td style={{ fontWeight: 600 }}>{a.topic}</td>
                      <td style={{ color: 'var(--t3)' }}>
                        {new Date(a.requestedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <span className="dot-status" style={s.textStyle}>
                          <span className="dot" style={{ background: s.dotColor }} />
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        {responseText ? (
                          <span style={{ fontSize: '12px', color: 'var(--t4)' }}>{responseText}</span>
                        ) : (
                          <span style={{ color: 'var(--t4)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0' }} />

        {/* Request form */}
        <div className="sage-card">
          <div className="sage-card-header">
            <div className="sage-card-title">New Request</div>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {hasPending && (
              <p className="empty-sub" style={{ margin: 0 }}>
                You have a pending request. Wait for your advisor to respond before submitting another.
              </p>
            )}
            {error && (
              <p style={{ fontSize: '13px', color: 'var(--red)', margin: 0 }}>{error}</p>
            )}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="input-label">Topic</label>
              <select
                className="sage-select"
                value={topic}
                onChange={e => setTopic(e.target.value as Topic)}
                disabled={hasPending}
              >
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="input-label">Requested Date</label>
              <input
                type="date"
                className="sage-input"
                value={requestedDate}
                onChange={e => setRequestedDate(e.target.value)}
                required
                disabled={hasPending}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="input-label">Notes (optional)</label>
              <textarea
                className="sage-input"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={hasPending}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div>
              <button
                type="submit"
                className="btn btn-amber"
                disabled={hasPending || submitting || !requestedDate}
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
