'use client';

import { useEffect, useState } from 'react';
import { getAdvisors, createAdvisor, updateAdvisor, deleteAdvisor, getMajors } from '../../../lib/api';
import { Major } from '../../../../shared/types';

interface Advisor {
  advisorId: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  major?: { majorId: string; name: string };
  students?: { studentId: string; name: string }[];
}

function AdvisorModal({
  advisor,
  majors,
  onClose,
  onSave,
}: {
  advisor: Advisor | null;
  majors: any[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(advisor?.name || '');
  const [email, setEmail] = useState(advisor?.email || '');
  const [majorId, setMajorId] = useState(advisor?.major?.majorId || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (advisor) {
        await updateAdvisor(advisor.advisorId, { name, email, majorId, ...(password ? { password } : {}) });
      } else {
        if (!password) { setError('Password is required for new advisors'); setLoading(false); return; }
        await createAdvisor({ name, email, password, majorId });
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
          <span className="modal-title">{advisor ? 'Edit Advisor' : 'Add Advisor'}</span>
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
              <label className="input-label">Full Name</label>
              <input className="sage-input" value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Jane Smith" required />
            </div>
            <div className="form-group">
              <label className="input-label">Email Address</label>
              <input className="sage-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="advisor@sage.edu" required />
            </div>
            <div className="form-group">
              <label className="input-label">Assigned Major</label>
              <select className="sage-select" value={majorId} onChange={e => setMajorId(e.target.value)} required>
                <option value="">Select a major...</option>
                {majors.map(m => <option key={m.majorId} value={m.majorId}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">{advisor ? 'New Password (leave blank to keep current)' : 'Password'}</label>
              <input className="sage-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost-light" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-amber" disabled={loading}>
              {loading ? 'Saving...' : advisor ? 'Save Changes' : 'Add Advisor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdvisorsPage() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [loadingMajors, setLoadingMajors] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Advisor | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [advisorsData, majorsData] = await Promise.all([
          getAdvisors(),
          getMajors()
        ]);
        setAdvisors(advisorsData);
        setMajors(majorsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
        setLoadingMajors(false);
      }
    };
    loadData();
  }, []);

  async function handleDelete(a: Advisor) {
    if (!confirm(`Remove advisor "${a.name}"? Their students will be unassigned.`)) return;
    try {
      await deleteAdvisor(a.advisorId);
      // Reload advisors after deletion
      const data = await getAdvisors();
      setAdvisors(data);
    } catch (err: any) {
      alert(err.message);
    }
  }

  const filtered = advisors.filter(
    a => a.name.toLowerCase().includes(search.toLowerCase()) ||
         a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Advisors</div>
        <div className="sage-page-sub">Manage advisor accounts and student assignments</div>
      </div>

      <div className="sage-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="sage-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input placeholder="Search advisors..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-amber" onClick={() => { setSelected(null); setModal('create'); }}>
            Add Advisor
          </button>
        </div>

        <div className="sage-card">
          {loading ? (
            <div className="loading-state">Loading advisors...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Major</th>
                  <th>Students Assigned</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.advisorId}>
                    <td><div style={{ fontWeight: 500 }}>{a.name}</div></td>
                    <td style={{ color: '#6b7280' }}>{a.email}</td>
                    <td style={{ color: '#6b7280', fontSize: '12px' }}>{a.major?.name ?? <span style={{ color: '#d1d5db' }}>Unassigned</span>}</td>
                    <td>
                      <span className="badge badge-amber">{a.students?.length ?? 0} students</span>
                    </td>
                    <td style={{ color: '#9ca3af', fontSize: '12px' }}>
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(a); setModal('edit'); }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-state">No advisors found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <AdvisorModal
          advisor={modal === 'edit' ? selected : null}
          majors={majors}
          onClose={() => setModal(null)}
          onSave={async () => {
            setModal(null);
            // Reload advisors after save
            const data = await getAdvisors();
            setAdvisors(data);
          }}
        />
      )}
    </>
  );
}
