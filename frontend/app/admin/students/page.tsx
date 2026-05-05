'use client';

import { useEffect, useState } from 'react';
import { getAdminStudents, getMajors, getAdvisors, createStudent, updateStudent, deleteStudent } from '../../../lib/api';

const DRIFT_DOT: Record<string, string> = {
  on_track:      'var(--green-dot)',
  early_warning: 'var(--yellow-dot)',
  drifting:      'var(--orange-dot)',
  critical:      'var(--red-dot)',
};

const DRIFT_LABELS: Record<string, string> = {
  on_track: 'On Track',
  early_warning: 'Early Warning',
  drifting: 'Drifting',
  critical: 'Critical',
};

function StudentModal({
  student, majors, advisors, onClose, onSave,
}: {
  student: any | null;
  majors: any[];
  advisors: any[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: student?.name || '',
    email: student?.email || '',
    majorId: student?.majorId || '',
    advisorId: student?.advisorId || '',
    enrollmentYear: student?.enrollmentYear || new Date().getFullYear(),
    currentSemester: student?.currentSemester || 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (student) {
        await updateStudent(student.studentId, form);
      } else {
        await createStudent(form);
      }
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
          <span className="modal-title">{student ? 'Edit Student' : 'Add Student'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', marginBottom: '12px' }}>
                {error}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Full Name</label>
                <input className="sage-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Email Address</label>
                <input className="sage-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="input-label">Major</label>
              <select className="sage-select" value={form.majorId} onChange={e => setForm({...form, majorId: e.target.value})} required>
                <option value="">Select major...</option>
                {majors.map(m => <option key={m.majorId} value={m.majorId}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">Assigned Advisor</label>
              <select className="sage-select" value={form.advisorId} onChange={e => setForm({...form, advisorId: e.target.value})}>
                <option value="">Unassigned</option>
                {advisors.map(a => <option key={a.advisorId} value={a.advisorId}>{a.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Enrollment Year</label>
                <input className="sage-input" type="number" value={form.enrollmentYear} onChange={e => setForm({...form, enrollmentYear: Number(e.target.value)})} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Current Semester</label>
                <input className="sage-input" type="number" min="1" max="12" value={form.currentSemester} onChange={e => setForm({...form, currentSemester: Number(e.target.value)})} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost-light" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-amber" disabled={loading}>
              {loading ? 'Saving...' : student ? 'Save Changes' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterMajor, setFilterMajor] = useState('');
  const [filterAdvisor, setFilterAdvisor] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [s, m, a] = await Promise.all([
        getAdminStudents({ majorId: filterMajor || undefined, advisorId: filterAdvisor || undefined }),
        getMajors(),
        getAdvisors(),
      ]);
      setStudents(s);
      setMajors(m);
      setAdvisors(a);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterMajor, filterAdvisor]);

  async function handleDelete(s: any) {
    if (!confirm(`Deactivate student "${s.name}"?`)) return;
    try {
      await deleteStudent(s.studentId);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const q = search.toLowerCase();
  const filtered = students.filter(
    s => s.name.toLowerCase().includes(q) ||
         s.email.toLowerCase().includes(q) ||
         (s.studentNumber || '').toLowerCase().includes(q)
  );

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Students</div>
        <div className="sage-page-sub">Manage all enrolled students across the university</div>
      </div>

      <div className="sage-body">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div className="sage-search" style={{ flex: '1', maxWidth: '260px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="sage-select" style={{ width: '160px' }} value={filterMajor} onChange={e => setFilterMajor(e.target.value)}>
            <option value="">All Majors</option>
            {majors.map(m => <option key={m.majorId} value={m.majorId}>{m.name}</option>)}
          </select>
          <select className="sage-select" style={{ width: '180px' }} value={filterAdvisor} onChange={e => setFilterAdvisor(e.target.value)}>
            <option value="">All Advisors</option>
            {advisors.map(a => <option key={a.advisorId} value={a.advisorId}>{a.name}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <button className="btn btn-amber" onClick={() => { setSelected(null); setModal('create'); }}>
            Add Student
          </button>
        </div>

        <div className="sage-card">
          {loading ? (
            <div className="loading-state">Loading students...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Major</th>
                  <th>Advisor</th>
                  <th>Semester</th>
                  <th>GPA</th>
                  <th>AI Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const report = s.aiReports?.[0];
                  const level = report?.driftLevel;
                  return (
                    <tr key={s.studentId}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{s.name}</div>
                        <div style={{ color: '#9ca3af', fontSize: '11px' }}>{s.email}</div>
                      </td>
                      <td style={{ color: '#6b7280', fontSize: '12px' }}>{s.major?.name}</td>
                      <td style={{ color: '#6b7280', fontSize: '12px' }}>{s.advisor?.name ?? <span style={{ color: '#d1d5db' }}>Unassigned</span>}</td>
                      <td style={{ color: '#6b7280' }}>S{s.currentSemester}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: s.cumulativeGpa < 2 ? '#dc2626' : '#111827' }}>
                          {s.cumulativeGpa?.toFixed(2) ?? '—'}
                        </span>
                      </td>
                      <td>
                        {level ? (
                          <span className="dot-status">
                            <span className="dot" style={{ background: DRIFT_DOT[level] }} />
                            {DRIFT_LABELS[level]}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--t4)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(s); setModal('edit'); }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">No students found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <StudentModal
          student={modal === 'edit' ? selected : null}
          majors={majors}
          advisors={advisors}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}
