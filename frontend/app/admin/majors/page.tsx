'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMajors, createMajor, updateMajor, deleteMajor, getAdvisors, createAdvisor } from '../../../lib/api';

function MajorModal({ major, onClose, onSave }: { major: any | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: major?.name || '',
    code: major?.code || '',
    faculty: major?.faculty || '',
    totalCredits: major?.totalCredits || 120,
    minimumCredits: major?.minimumCredits || 90,
    description: major?.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (major) {
        await updateMajor(major.majorId, form);
      } else {
        await createMajor(form);
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
          <span className="modal-title">{major ? 'Edit Major' : 'Add Major'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', marginBottom: '12px' }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="input-label">Major Name</label>
              <input className="sage-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Computer Science" required />
            </div>
            <div className="form-group">
              <label className="input-label">Code</label>
              <input className="sage-input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="e.g. CS" />
            </div>
            <div className="form-group">
              <label className="input-label">Faculty / School</label>
              <input className="sage-input" value={form.faculty} onChange={e => setForm({...form, faculty: e.target.value})} placeholder="e.g. Faculty of Engineering" required />
            </div>
            <div className="form-group">
              <label className="input-label">Total Credit Hours</label>
              <input className="sage-input" type="number" value={form.totalCredits} onChange={e => setForm({...form, totalCredits: Number(e.target.value)})} />
            </div>
            <div className="form-group">
              <label className="input-label">Minimum Credits</label>
              <input className="sage-input" type="number" value={form.minimumCredits} onChange={e => setForm({...form, minimumCredits: Number(e.target.value)})} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Description (for AI context)</label>
              <textarea
                className="sage-input"
                style={{ height: '80px', resize: 'vertical' }}
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Describe what this major is about..."
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost-light" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-amber" disabled={loading}>
              {loading ? 'Saving...' : major ? 'Save Changes' : 'Add Major'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdvisorModal({ major, advisors, onClose, onSave }: { major: any; advisors: any[]; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createAdvisor({ ...form, majorId: major.majorId });
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
          <span className="modal-title">Add Advisor to {major.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', marginBottom: '12px' }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="input-label">Advisor Name</label>
              <input className="sage-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Dr. Jane Smith" required />
            </div>
            <div className="form-group">
              <label className="input-label">Email Address</label>
              <input className="sage-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="advisor@sage.edu" required />
            </div>
            <div className="form-group">
              <label className="input-label">Password</label>
              <input className="sage-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" required />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost-light" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-amber" disabled={loading}>
              {loading ? 'Adding...' : 'Add Advisor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MajorsPage() {
  const [majors, setMajors] = useState<any[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | 'advisor' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const router = useRouter();

  async function load() {
    setLoading(true);
    try {
      const [majorsData, advisorsData] = await Promise.all([
        getMajors(),
        getAdvisors()
      ]);
      setMajors(majorsData);
      setAdvisors(advisorsData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(m: any) {
    if (!confirm(`Delete major "${m.name}"? This will fail if students are enrolled.`)) return;
    try {
      await deleteMajor(m.majorId);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Majors</div>
        <div className="sage-page-sub">Manage academic departments and programs</div>
      </div>

      <div className="sage-body">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button className="btn btn-amber" onClick={() => { setSelected(null); setModal('create'); }}>
            Add Major
          </button>
        </div>

        <div className="sage-card">
          {loading ? (
            <div className="loading-state">Loading majors...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Major Name</th>
                  <th>Code</th>
                  <th>Faculty</th>
                  <th>Credits</th>
                  <th>Min Credits</th>
                  <th>Advisors</th>
                  <th>Description</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {majors.map(m => {
                  const majorAdvisors = advisors.filter(a => a.major?.majorId === m.majorId);
                  return (
                    <tr key={m.majorId}>
                      <td>
                        <button
                          style={{ fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '13px' }}
                          onClick={() => router.push(`/admin/majors/${m.majorId}`)}
                        >
                          {m.name}
                        </button>
                      </td>
                      <td style={{ color: '#6b7280' }}>{m.code || '—'}</td>
                      <td style={{ color: '#6b7280' }}>{m.faculty}</td>
                      <td style={{ color: '#6b7280' }}>{m.totalCredits} hrs</td>
                      <td style={{ color: '#6b7280' }}>{m.minimumCredits ?? 90}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {majorAdvisors.length > 0 ? (
                            majorAdvisors.map(a => (
                              <span key={a.advisorId} style={{ fontSize: '12px', color: '#374151' }}>
                                {a.name}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>No advisors</span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: '#9ca3af', fontSize: '12px', maxWidth: '300px' }}>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {m.description || '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(m); setModal('advisor'); }}>Add Advisor</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/admin/majors/${m.majorId}`)}>Courses</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(m); setModal('edit'); }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {majors.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">No majors found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <MajorModal
          major={modal === 'edit' ? selected : null}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}

      {modal === 'advisor' && (
        <AdvisorModal
          major={selected}
          advisors={advisors}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}
