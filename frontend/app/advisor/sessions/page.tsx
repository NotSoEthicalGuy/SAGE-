'use client';

import { useEffect, useState } from 'react';
import { getSessions, createSession, getStudents, getCourses, getMajors, markAttendance } from '../../../lib/api';

function NewSessionModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [courses, setCourses] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [form, setForm] = useState({ courseId: '', date: new Date().toISOString().split('T')[0], title: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getMajors(), getCourses()]).then(([m, c]) => {
      setMajors(m);
      setCourses(c);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createSession({ courseId: form.courseId, date: new Date(form.date).toISOString(), title: form.title || undefined });
      onSave();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Open New Session</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
            <div className="form-group">
              <label className="input-label">Course</label>
              <select className="sage-select" value={form.courseId} onChange={e => setForm({...form, courseId: e.target.value})} required>
                <option value="">Select course...</option>
                {courses.map(c => <option key={c.courseId} value={c.courseId}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">Session Date</label>
              <input className="sage-input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Session Title (optional)</label>
              <input className="sage-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Week 3 — Algorithms Review" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost-light" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-amber" disabled={loading}>{loading ? 'Creating...' : 'Open Session'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AttendanceModal({ session, students, onClose, onSave }: { session: any; students: any[]; onClose: () => void; onSave: () => void }) {
  const existingAttendance: Record<string, boolean> = {};
  session.attendance?.forEach((a: any) => { existingAttendance[a.studentId] = a.present; });
  const [attendance, setAttendance] = useState<Record<string, boolean>>(existingAttendance);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const records = students.map(s => ({ studentId: s.studentId, present: attendance[s.studentId] ?? false }));
      await markAttendance(session.sessionId, records);
      onSave();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <span className="modal-title">Attendance — {session.course?.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: 0 }}>
          <div style={{ padding: '8px 0' }}>
            {students.map(s => (
              <div key={s.studentId} style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '13px' }}>{s.name}</div>
                  <div style={{ color: '#9ca3af', fontSize: '11px' }}>{s.email}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${attendance[s.studentId] === true ? 'btn-amber' : 'btn-ghost-light'}`}
                    onClick={() => setAttendance(prev => ({...prev, [s.studentId]: true}))}
                  >Present</button>
                  <button
                    type="button"
                    className={`btn btn-sm ${attendance[s.studentId] === false && s.studentId in attendance ? 'btn-danger' : 'btn-ghost-light'}`}
                    onClick={() => setAttendance(prev => ({...prev, [s.studentId]: false}))}
                  >Absent</button>
                </div>
              </div>
            ))}
            {students.length === 0 && (
              <div className="empty-state">No students assigned to you</div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost-light" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-amber" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [attendanceSession, setAttendanceSession] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const [s, st] = await Promise.all([getSessions(), getStudents()]);
      setSessions(s);
      setStudents(st);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Class Sessions</div>
        <div className="sage-page-sub">Open sessions and track student attendance</div>
      </div>

      <div className="sage-body">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button className="btn btn-amber" onClick={() => setShowNew(true)}>Open New Session</button>
        </div>

        <div className="sage-card">
          {loading ? (
            <div className="loading-state">Loading sessions...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Attendance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => {
                  const present = s.attendance?.filter((a: any) => a.present).length ?? 0;
                  const total = s.attendance?.length ?? 0;
                  return (
                    <tr key={s.sessionId}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{s.course?.name}</div>
                        <div style={{ color: '#9ca3af', fontSize: '11px', fontFamily: 'monospace' }}>{s.course?.code}</div>
                      </td>
                      <td style={{ color: '#6b7280' }}>{s.title || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                      <td style={{ color: '#6b7280', fontSize: '12.5px' }}>{new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td>
                        {total > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 500, fontSize: '12.5px' }}>{present}/{total}</span>
                            <div style={{ width: '60px', height: '3px', background: '#e5e7eb', borderRadius: '2px' }}>
                              <div style={{ height: '100%', width: `${total > 0 ? (present/total) * 100 : 0}%`, background: '#16a34a', borderRadius: '2px' }} />
                            </div>
                          </div>
                        ) : <span style={{ color: '#d1d5db', fontSize: '12px' }}>No records yet</span>}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => setAttendanceSession(s)}>
                          Mark Attendance
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {sessions.length === 0 && (
                  <tr><td colSpan={5} className="empty-state">No sessions created yet</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showNew && (
        <NewSessionModal onClose={() => setShowNew(false)} onSave={() => { setShowNew(false); load(); }} />
      )}
      {attendanceSession && (
        <AttendanceModal
          session={attendanceSession}
          students={students}
          onClose={() => setAttendanceSession(null)}
          onSave={() => { setAttendanceSession(null); load(); }}
        />
      )}
    </>
  );
}
