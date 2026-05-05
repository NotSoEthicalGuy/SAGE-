'use client';

import { useEffect, useState } from 'react';
import { getAdvisorAppointments, updateAdvisorAppointment } from '@/lib/api';

const STATUS_OPTIONS = ['pending', 'confirmed', 'cancelled'] as const;

export default function AdvisorAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('confirmed');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAdvisorAppointments()
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleRespond(appointmentId: string) {
    if (expandedId === appointmentId) {
      setExpandedId(null);
    } else {
      setExpandedId(appointmentId);
      setResponseText('');
      setSelectedStatus('confirmed');
    }
  }

  async function handleSave(appointmentId: string, currentStatus: string) {
    setSaving(true);
    try {
      const payload: any = { status: selectedStatus };
      if (selectedStatus === 'confirmed') payload.advisorResponse = responseText;
      if (selectedStatus === 'cancelled') payload.cancellationReason = responseText;

      const updated = await updateAdvisorAppointment(appointmentId, payload);
      setAppointments(prev => {
        const list = prev.map(a => a.appointmentId === appointmentId ? { ...a, ...updated } : a);
        return [
          ...list.filter(a => a.status === 'pending'),
          ...list.filter(a => a.status !== 'pending'),
        ];
      });
      setExpandedId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="sage-body"><div className="loading-state">Loading…</div></div>;

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Appointments</div>
        <div className="sage-page-sub">Review and respond to student appointment requests.</div>
      </div>

      <div className="sage-body">
        <div className="sage-card">
          <div className="sage-card-header">
            <div className="sage-card-title">All Requests</div>
          </div>
          {appointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-rule" />
              <div>
                <p className="empty-msg">No appointment requests.</p>
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Topic</th>
                  <th>Requested Date</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a: any) => (
                  <>
                    <tr key={a.appointmentId}>
                      <td style={{ fontWeight: 600 }}>{a.student?.name ?? '—'}</td>
                      <td>{a.topic}</td>
                      <td style={{ color: 'var(--t3)' }}>
                        {new Date(a.requestedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ color: 'var(--t3)', maxWidth: '180px' }}>
                        {a.notes ? (
                          <span style={{ fontSize: '12px' }}>{a.notes}</span>
                        ) : '—'}
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--t2)' }}>
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </span>
                        {(a.status === 'confirmed' || a.status === 'cancelled') && (a.advisorResponse || a.cancellationReason) && (
                          <div style={{ fontSize: '11px', color: 'var(--t4)', marginTop: '2px' }}>
                            {a.advisorResponse || a.cancellationReason}
                          </div>
                        )}
                      </td>
                      <td>
                        {a.status === 'pending' && (
                          <button
                            onClick={() => handleRespond(a.appointmentId)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--am-2)', fontSize: '12px', fontWeight: 600,
                              padding: '2px 0', fontFamily: 'inherit',
                            }}
                          >
                            {expandedId === a.appointmentId ? 'Cancel' : 'Respond'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === a.appointmentId && (
                      <tr key={`${a.appointmentId}-expand`}>
                        <td colSpan={6} style={{ background: '#f7f7f8', padding: '12px 22px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                            <div>
                              <label className="input-label">Status</label>
                              <select
                                className="sage-select"
                                value={selectedStatus}
                                onChange={e => setSelectedStatus(e.target.value)}
                                style={{ width: '140px' }}
                              >
                                {STATUS_OPTIONS.map(s => (
                                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <label className="input-label">
                                {selectedStatus === 'cancelled' ? 'Cancellation Reason' : 'Response Note'}
                              </label>
                              <input
                                type="text"
                                className="sage-input"
                                value={responseText}
                                onChange={e => setResponseText(e.target.value)}
                                placeholder={selectedStatus === 'cancelled' ? 'Reason for cancellation…' : 'Your response…'}
                              />
                            </div>
                            <button
                              className="btn btn-ghost-light"
                              onClick={() => handleSave(a.appointmentId, a.status)}
                              disabled={saving}
                            >
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
